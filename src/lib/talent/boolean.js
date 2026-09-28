// Boolean search: parser, validator, evaluator and pretty-printer.
//
// Syntax (what a recruiter can type):
//   python AND aws            both        (AND is optional: `python aws` = AND)
//   react OR vue              either
//   NOT java   /  -java  /  !java   exclude
//   ( ... )                   grouping, nestable:  python AND (aws OR gcp)
//   "machine learning"        exact phrase
//   pytho*                    wildcard (any ending)
//   title:"data scientist"    field search: title skill company location edu name industry job
//   exp:3-5  exp:>=4  notice:<=30  salary:<20      numeric fields (years / days / LPA)
// AND / OR / NOT are case-insensitive; precedence is NOT > AND > OR.
//
// The AST is plain JSON, so it is stored inside SearchCriteria and survives
// saved searches and reloads.

import { canonCity } from './vocab'

export class BoolError extends Error {
  constructor(message, pos) {
    super(message)
    this.pos = pos
  }
}

const FIELDS = {
  title: 'title', role: 'title', designation: 'title',
  skill: 'skill', skills: 'skill',
  company: 'company', employer: 'company',
  location: 'location', city: 'location', loc: 'location',
  edu: 'edu', education: 'edu', degree: 'edu', institute: 'edu',
  name: 'name', industry: 'industry', job: 'job',
  exp: 'exp', experience: 'exp', notice: 'notice', salary: 'salary', ctc: 'salary',
}
const NUMERIC = new Set(['exp', 'notice', 'salary'])
export const FIELD_HELP = [
  ['title:', 'Job title or past roles'], ['skill:', 'Skills'], ['company:', 'Current or past company'],
  ['location:', 'Current or preferred city'], ['edu:', 'Degree or institute'], ['exp:', 'Years — exp:3-5, exp:>=4'],
  ['notice:', 'Days — notice:<=30'], ['salary:', 'Expected LPA — salary:<20'],
]

// ---- tokenizer ---------------------------------------------------------------

function tokenize(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) { i++; continue }
    if (ch === '(' || ch === ')') { out.push({ k: ch, pos: i }); i++; continue }
    if (ch === '"') {
      const end = src.indexOf('"', i + 1)
      if (end < 0) throw new BoolError('Closing quote " is missing', i)
      out.push({ k: 'term', v: src.slice(i + 1, end), quoted: true, pos: i })
      i = end + 1
      continue
    }
    if (src.startsWith('&&', i)) { out.push({ k: 'AND', pos: i }); i += 2; continue }
    if (src.startsWith('||', i)) { out.push({ k: 'OR', pos: i }); i += 2; continue }
    if (ch === '!' || (ch === '-' && !/\s/.test(src[i + 1] ?? ' '))) { out.push({ k: 'NOT', pos: i }); i++; continue }
    if (ch === '+') { i++; continue } // "+term" = required, which is already the default
    let j = i
    while (j < src.length && !/[\s()"]/.test(src[j])) j++
    let word = src.slice(i, j)
    // field:"quoted phrase"
    if (/^[a-z]+:$/i.test(word) && src[j] === '"') {
      const end = src.indexOf('"', j + 1)
      if (end < 0) throw new BoolError('Closing quote " is missing', j)
      out.push({ k: 'term', field: word.slice(0, -1), v: src.slice(j + 1, end), quoted: true, pos: i })
      i = end + 1
      continue
    }
    const up = word.toUpperCase()
    if (up === 'AND' || up === 'OR' || up === 'NOT') out.push({ k: up, pos: i })
    else out.push({ k: 'term', v: word, pos: i })
    i = j
  }
  return out
}

// ---- parser (recursive descent) ------------------------------------------------

function numericNode(field, raw, pos) {
  const m = raw.match(/^(>=|<=|>|<|=)?\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\+?$/)
  if (!m) throw new BoolError(`“${field}:${raw}” needs a number — try ${field}:3-5 or ${field}:>=4`, pos)
  if (m[3] != null) return { t: 'num', field, op: 'between', a: Number(m[2]), b: Number(m[3]) }
  const op = m[1] ?? (raw.endsWith('+') ? '>=' : '=')
  return { t: 'num', field, op, a: Number(m[2]) }
}

function toTerm(tok) {
  let field = tok.field
  let v = tok.v
  if (!field) {
    const m = v.match(/^([a-z]+):(.+)$/i)
    if (m && FIELDS[m[1].toLowerCase()]) { field = m[1]; v = m[2] }
    else if (m && !tok.quoted) throw new BoolError(`Unknown field “${m[1]}:” — use title:, skill:, company:, location:, edu:, exp:, notice: or salary:`, tok.pos)
  }
  if (field) {
    const f = FIELDS[field.toLowerCase()]
    if (!f) throw new BoolError(`Unknown field “${field}:” — use ${Object.keys(FIELDS).slice(0, 8).join(', ')}…`, tok.pos)
    if (NUMERIC.has(f)) return numericNode(f, v, tok.pos)
    if (!v.trim()) throw new BoolError(`Add a value after “${field}:”`, tok.pos)
    return { t: 'term', field: f, v, phrase: !!tok.quoted }
  }
  return { t: 'term', v, phrase: !!tok.quoted }
}

function parse(src) {
  const toks = tokenize(src)
  let p = 0
  const peek = () => toks[p]

  function primary() {
    const t = peek()
    if (!t) throw new BoolError('The search ends too early — add a term', src.length)
    if (t.k === '(') {
      p++
      if (peek()?.k === ')') throw new BoolError('Empty brackets ( )', t.pos)
      const e = or()
      if (peek()?.k !== ')') throw new BoolError('Closing bracket ) is missing', t.pos)
      p++
      return e
    }
    if (t.k === ')') throw new BoolError('Unexpected closing bracket )', t.pos)
    if (t.k === 'AND' || t.k === 'OR') throw new BoolError(`${t.k} needs a term on its left`, t.pos)
    p++
    return toTerm(t)
  }

  function unary() {
    const t = peek()
    if (t?.k === 'NOT') {
      p++
      if (!peek() || peek().k === ')') throw new BoolError('NOT needs a term after it', t.pos)
      return { t: 'not', c: unary() }
    }
    return primary()
  }

  function and() {
    const items = [unary()]
    for (;;) {
      const t = peek()
      if (!t || t.k === ')' || t.k === 'OR') break
      if (t.k === 'AND') {
        p++
        if (!peek() || peek().k === ')' || peek().k === 'OR') throw new BoolError('AND needs a term after it', t.pos)
      }
      items.push(unary()) // adjacent terms are an implicit AND
    }
    return items.length === 1 ? items[0] : { t: 'and', c: items }
  }

  function or() {
    const items = [and()]
    while (peek()?.k === 'OR') {
      const t = peek()
      p++
      if (!peek() || peek().k === ')') throw new BoolError('OR needs a term after it', t.pos)
      items.push(and())
    }
    return items.length === 1 ? items[0] : { t: 'or', c: items }
  }

  if (!toks.length) return null
  const ast = or()
  if (p < toks.length) {
    const t = toks[p]
    throw new BoolError(t.k === ')' ? 'Unexpected closing bracket )' : `Unexpected “${t.v ?? t.k}”`, t.pos)
  }
  return ast
}

/** @returns {{ok:true, ast:object|null} | {ok:false, error:string, pos:number}} */
export function validateBoolean(src) {
  try {
    return { ok: true, ast: parse(src) }
  } catch (e) {
    if (e instanceof BoolError) return { ok: false, error: e.message, pos: e.pos }
    throw e
  }
}

// ---- evaluation ------------------------------------------------------------------

const norm = (s) => (s ?? '').toString().toLowerCase()
const reCache = new Map()

function termRegex(v) {
  let re = reCache.get(v)
  if (!re) {
    const body = v.trim().toLowerCase().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^\\s,;|]*')
    re = new RegExp(`(^|[^a-z0-9])${body}($|[^a-z0-9])`, 'i')
    reCache.set(v, re)
  }
  return re
}

function fieldText(c, f) {
  switch (f) {
    case 'title': return [c.designation, c.appliedFor, ...c.workHistory.map((w) => w.role)].join(' | ')
    case 'skill': return c.skills.join(' | ')
    case 'company': return [c.currentCompany, ...c.workHistory.map((w) => w.company)].join(' | ')
    case 'location': return [c.location, ...c.preferredLocations, canonCity(c.location)].join(' | ')
    case 'edu': return c.education.map((e) => `${e.degree} ${e.institute}`).join(' | ')
    case 'name': return c.name
    case 'industry': return c.industry
    case 'job': return c.jobTitle || c.appliedFor
    default: return ''
  }
}

const NUM = { exp: (c) => c.experienceYears, notice: (c) => c.noticePeriodDays, salary: (c) => c.expectedSalaryLPA }

function cmp(v, n) {
  if (v == null) return false
  switch (n.op) {
    case '>': return v > n.a
    case '>=': return v >= n.a
    case '<': return v < n.a
    case '<=': return v <= n.a
    case 'between': return v >= n.a && v <= n.b
    default: return v === n.a
  }
}

/** @param scopeText  (candidate) => string — the haystack for terms without a field (respects "Search in") */
export function evalBool(ast, c, scopeText) {
  if (!ast) return true
  switch (ast.t) {
    case 'and': return ast.c.every((n) => evalBool(n, c, scopeText))
    case 'or': return ast.c.some((n) => evalBool(n, c, scopeText))
    case 'not': return !evalBool(ast.c, c, scopeText)
    case 'num': return cmp(NUM[ast.field](c), ast)
    default: {
      // "Bangalore" and "Bengaluru" are the same place, whichever spelling the recruiter or profile uses.
      if (ast.field === 'location' && !ast.v.includes('*')) {
        const want = canonCity(ast.v)
        if ([c.location, ...c.preferredLocations].some((l) => canonCity(l) === want)) return true
      }
      const hay = ast.field ? fieldText(c, ast.field) : scopeText(c)
      return termRegex(ast.v).test(norm(hay))
    }
  }
}

// ---- helpers for the UI --------------------------------------------------------

/** Positive (non-negated) text terms — used for highlighting and relevance. */
export function collectTerms(ast, negated = false, out = []) {
  if (!ast) return out
  if (ast.t === 'not') collectTerms(ast.c, !negated, out)
  else if (ast.t === 'and' || ast.t === 'or') ast.c.forEach((n) => collectTerms(n, negated, out))
  else if (ast.t === 'term' && !negated) out.push(ast.v.replace(/\*/g, ''))
  return out.filter(Boolean)
}

const numLabel = (n) => (n.op === 'between' ? `${n.field}:${n.a}-${n.b}` : `${n.field}:${n.op === '=' ? '' : n.op}${n.a}`)

/** Canonical, fully-parenthesised-where-needed text — shown back to the recruiter as "Reads as". */
export function boolToString(ast, parent = null) {
  if (!ast) return ''
  if (ast.t === 'term') {
    const v = ast.phrase || /\s/.test(ast.v) ? `"${ast.v}"` : ast.v
    return ast.field ? `${ast.field}:${v}` : v
  }
  if (ast.t === 'num') return numLabel(ast)
  if (ast.t === 'not') return `NOT ${boolToString(ast.c, 'not')}`
  const s = ast.c.map((n) => boolToString(n, ast.t)).join(ast.t === 'and' ? ' AND ' : ' OR ')
  return (ast.t === 'or' && (parent === 'and' || parent === 'not')) || (ast.t === 'and' && parent === 'not') ? `(${s})` : s
}

export const BOOLEAN_EXAMPLES = [
  'python AND (aws OR gcp) NOT java',
  '"machine learning" AND (tensorflow OR pytorch) -intern',
  'title:"data analyst" AND skill:sql AND exp:2-5',
  'react* AND location:pune AND notice:<=30',
]
