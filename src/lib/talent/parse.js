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
      c.role = `${lead[0].toUpperCase()}${lead.slice(1)} ${noun[0].toUpperCase()}${noun.slice(1).toLowerCase()}`
      if (vocab.skills.some((s) => s.toLowerCase() === lead.toLowerCase()) && !c.skills.includes(vocab.skills.find((s) => s.toLowerCase() === lead.toLowerCase()))) {
        c.skills.push(vocab.skills.find((s) => s.toLowerCase() === lead.toLowerCase()))
      }
    }
  }

  c.industry = vocab.industries.find((i) => has(t, i)) ?? ''
  const excl = [...t.matchAll(/\b(?:not|without|excluding|except)\s+([a-z0-9+#./]+)/gi)].map((m) => m[1])
  c.exclude = excl
  if (/verified/i.test(t)) c.verifiedOnly = true
  return c
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

export { exampleQueries } from './vocab'
