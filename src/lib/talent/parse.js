// Turns what the recruiter typed into structured SearchCriteria.
//
// There is no LLM behind this yet: the "AI" parser is a deterministic
// vocabulary/regex extractor and the UI says so ("Understood by Mzobs
// parser"). It is isolated here so `parseNaturalLanguage` can later be swapped
// for a `POST /talent/parse-query` call without touching any caller — they
// only depend on the returned criteria shape.

import { makeCriteria } from './criteria'
import { validateBoolean } from './boolean'
import { vocab, CITY_ALIASES, canonCity } from './vocab'
import { escapeRegex } from '../tfmt'
import { apiClient } from '../api'

function has(text, term) {
  return new RegExp(`(^|[^a-z0-9+#.])${escapeRegex(term)}([^a-z0-9+#]|$)`, 'i').test(text)
}

export function parseNaturalLanguage(text) {
  const c = makeCriteria({ q: text, mode: 'ai' })
  if (!text?.trim()) return c
  const t = text

  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i)
  const plus = t.match(/(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?)/i)
  const atLeast = t.match(/(?:at least|minimum|min\.?)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i)
  const single = t.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i)
  if (range) { c.expMin = Number(range[1]); c.expMax = Number(range[2]) }
  else if (plus || atLeast) { c.expMin = Number((plus ?? atLeast)[1]) }
  else if (single) { c.expMin = Math.max(0, Number(single[1]) - 1); c.expMax = Number(single[1]) + 1 }

  const within = t.match(/(?:within|in|under|<=?|≤)\s*(\d+)\s*days?/i)
  if (within) c.noticeMax = Number(within[1])
  else if (/immediate(ly)?|can join now|serving no notice/i.test(t)) c.noticeMax = 0

  const under = t.match(/(?:under|below|up to|<=?|max(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?|l)\b/i)
  const between = t.match(/(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i)
  if (between) { c.salaryMin = Number(between[1]); c.salaryMax = Number(between[2]) }
  else if (under) c.salaryMax = Number(under[1])

  c.skills = vocab.skills.filter((s) => has(t, s))

  // One entry per real place: the spelling used in the data wins over the alias table ("Bangalore" vs "Bengaluru").
  const cities = new Map()
  for (const s of vocab.cities) if (has(t, s)) cities.set(canonCity(s), s)
  for (const [alias, city] of Object.entries(CITY_ALIASES)) {
    if (!has(t, alias)) continue
    const k = canonCity(city)
    if (!cities.has(k)) cities.set(k, vocab.cities.find((v) => canonCity(v) === k) ?? city)
  }
  c.locations = [...cities.values()]

  if (/\bremote\b/i.test(t)) c.workMode = 'Remote'
  else if (/\bhybrid\b/i.test(t)) c.workMode = 'Hybrid'

  const roles = vocab.roles.filter((r) => has(t, r)).sort((a, b) => b.length - a.length)
  if (roles.length) c.role = roles[0]
  else {
    // "Python developers" → role "Python Developer"
    const m = t.match(/\b([a-z+#.]+(?:\s[a-z+#.]+)?)\s+(developers?|engineers?|designers?|analysts?)\b/i)
    if (m) {
      const lead = m[1].split(/\s+/).pop()
      const noun = m[2].replace(/s$/i, '')
      const nounCap = `${noun[0].toUpperCase()}${noun.slice(1).toLowerCase()}`
      // "looking for developers" → the lead word is filler, not part of the role
      c.role = FILLER.has(lead.toLowerCase()) ? nounCap : `${lead[0].toUpperCase()}${lead.slice(1)} ${nounCap}`
      if (!FILLER.has(lead.toLowerCase()) && vocab.skills.some((s) => s.toLowerCase() === lead.toLowerCase()) && !c.skills.includes(vocab.skills.find((s) => s.toLowerCase() === lead.toLowerCase()))) {
        c.skills.push(vocab.skills.find((s) => s.toLowerCase() === lead.toLowerCase()))
      }
    }
  }

  c.industry = vocab.industries.find((i) => has(t, i)) ?? ''
  const excl = [...t.matchAll(/\b(?:not|without|excluding|except)\s+([a-z0-9+#./]+)/gi)].map((m) => m[1])
  c.exclude = excl
  if (/verified/i.test(t)) c.verifiedOnly = true
  c.keywords = leftoverWords(t, c)
  return c
}

const FILLER = new Set(('a an and any are as at be but by can for from has have in is it of on or the to who with looking need needs want wanted hiring hire find show me us candidate candidates profile profiles people person resource resources someone ' +
  'experience experienced years year yrs yr days day notice period joiner join available availability within under below above over least minimum maximum max min up lpa lakh lakhs salary ctc ' +
  'not without excluding except remote hybrid onsite verified immediate immediately based located location in near around skilled skills skill knowledge good strong best top expert ' +
  'developer developers engineer engineers designer designers analyst analysts').split(' '))

/**
 * LLM-backed parse (POST /ai/parse-query). Any failure — no key on the server, timeout,
 * rate limit — falls back to the local parser, so search always works. Use on submit only;
 * the local parser stays the live, as-you-type one.
 */
export async function parseNaturalLanguageAI(text) {
  const local = parseNaturalLanguage(text)
  if (!text?.trim()) return local
  try {
    const { data } = await apiClient.post('/ai/parse-query', { text }, { timeout: 12000 })
    const ai = makeCriteria({ ...data.filters, q: text, mode: 'ai' })
    return hasStructure(ai) ? mergeWithLocal(ai, local) : local
  } catch {
    return local
  }
}

/**
 * The model understands wording; the local parser knows the exact spellings in our data
 * ("Bengaluru", "Node.js"). Keep the model's result, add what only the vocabulary caught, and
 * fill fields the model left empty. Leftover-word keywords from the local parser are not merged:
 * the model already decided which words matter.
 */
function mergeWithLocal(ai, local) {
  const union = (a, b, key = (x) => x.toLowerCase()) => {
    const seen = new Set(a.map(key))
    return [...a, ...b.filter((x) => !seen.has(key(x)))]
  }
  const c = { ...ai }
  c.skills = union(ai.skills, local.skills)
  c.locations = union(local.locations, ai.locations, canonCity) // vocabulary spelling wins
  c.exclude = union(ai.exclude, local.exclude)
  for (const k of ['role', 'industry', 'workMode']) if (!c[k]) c[k] = local[k]
  for (const k of ['expMin', 'expMax', 'salaryMin', 'salaryMax', 'noticeMax']) if (c[k] == null) c[k] = local[k]
  if (local.verifiedOnly) c.verifiedOnly = true
  return c
}

const hasStructure = (c) => Boolean(c.role || c.skills.length || c.locations.length || c.keywords.length || c.industry || c.workMode ||
  c.expMin != null || c.expMax != null || c.salaryMin != null || c.salaryMax != null || c.noticeMax != null)

/**
 * Words the recruiter typed that no filter picked up (an unknown skill, tool or domain).
 * They become required keywords, so a search never silently widens to "everyone" just
 * because the vocabulary didn't recognise a word.
 */
function leftoverWords(text, c) {
  let rest = ` ${text.toLowerCase()} `
  const eat = (s) => { if (s) rest = rest.split(String(s).toLowerCase()).join(' ') }
  ;[...c.skills, ...c.locations, c.role, c.industry].forEach(eat)
  Object.keys(CITY_ALIASES).forEach((a) => { if (has(text, a)) eat(a) })
  c.exclude.forEach(eat)
  rest = rest.replace(/[\d.]+\s*(?:-|–|to)?\s*[\d.]*\s*\+?\s*(?:years?|yrs?|days?|lpa|lakhs?|l)\b/g, ' ')
  const out = []
  for (const w of rest.split(/[^a-z0-9+#.]+/)) {
    const word = w.replace(/^\.+|\.+$/g, '')
    if (word.length < 2 || FILLER.has(word) || /^[\d.]+$/.test(word) || out.includes(word)) continue
    out.push(word)
  }
  return out
}

/**
 * Boolean mode → criteria carrying the parsed expression. Callers should run
 * `validateBoolean` first and show its error; an invalid query here yields no filter.
 */
export function parseBoolean(text) {
  const c = makeCriteria({ q: text, mode: 'boolean' })
  const v = validateBoolean(text)
  if (v.ok) c.boolExpr = v.ast
  return c
}

/** Keyword mode: whitespace/comma separated terms, all required. */
export function parseKeywords(text) {
  const c = makeCriteria({ q: text, mode: 'keyword' })
  c.keywords = text.split(/[,\n]+|\s{2,}/).map((s) => s.trim()).filter(Boolean)
  if (c.keywords.length === 1 && /\s/.test(c.keywords[0])) c.keywords = c.keywords[0].split(/\s+/)
  return c
}

export function parseQuery(text, mode) {
  if (mode === 'boolean') return parseBoolean(text)
  if (mode === 'keyword') return parseKeywords(text)
  return parseNaturalLanguage(text)
}

/** Same as parseQuery, but AI mode asks the server's LLM first. */
export async function parseQueryAI(text, mode) {
  return mode === 'ai' ? parseNaturalLanguageAI(text) : parseQuery(text, mode)
}

export { exampleQueries } from './vocab'
