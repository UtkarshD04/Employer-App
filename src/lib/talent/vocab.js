// The vocabulary the query parser and filter suggestions match against — rebuilt from the
// candidates actually loaded (see services/talent.js), so "React developers in Pune" only
// recognises skills, roles and cities that exist in the data being searched.

export const vocab = {
  skills: [],
  roles: [],
  cities: [],
  states: [],
  industries: [],
  companyTypes: [],
  departments: [],
  degrees: [],
  institutes: [],
  languages: [],
  companies: [],
}

const uniq = (list) => [...new Map(list.filter(Boolean).map((v) => [v.trim().toLowerCase(), v.trim()])).values()]

/** Rebuilds the vocabulary from a candidate pool. Empty categories keep nothing. */
export function setVocabularyFrom(pool) {
  vocab.skills = uniq(pool.flatMap((c) => c.skills))
  vocab.roles = uniq(pool.flatMap((c) => [c.designation, ...c.workHistory.map((w) => w.role)]))
  vocab.cities = uniq(pool.flatMap((c) => [c.location, ...c.preferredLocations]))
  vocab.states = uniq(pool.map((c) => c.state))
  vocab.industries = uniq(pool.map((c) => c.industry))
  vocab.companyTypes = uniq(pool.map((c) => c.companyType))
  vocab.departments = uniq(pool.map((c) => c.department))
  vocab.degrees = uniq(pool.flatMap((c) => c.education.map((e) => e.degree)))
  vocab.institutes = uniq(pool.flatMap((c) => [c.college, ...c.education.map((e) => e.institute)]))
  vocab.languages = uniq(pool.flatMap((c) => c.languages ?? []))
  vocab.companies = uniq(pool.flatMap((c) => [c.currentCompany, ...c.workHistory.map((w) => w.company)]))
}

const CITY_ALIASES = {
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  bombay: 'Mumbai',
  gurgaon: 'Delhi NCR',
  gurugram: 'Delhi NCR',
  noida: 'Delhi NCR',
  delhi: 'Delhi NCR',
  ncr: 'Delhi NCR',
  'new delhi': 'Delhi NCR',
  madras: 'Chennai',
  calcutta: 'Kolkata',
  poona: 'Pune',
}
export { CITY_ALIASES }

/** Normalises a city for comparison: "Bangalore " and "bengaluru" are the same place. */
export function canonCity(s) {
  const k = (s ?? '').toString().trim().toLowerCase().replace(/[.,]$/, '')
  return (CITY_ALIASES[k] ?? k).toLowerCase()
}

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]
const stateKey = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
const STATE_BY_KEY = new Map(STATES.map((s) => [stateKey(s), s]))
// Abbreviations and older names candidates type into the free-text State box.
const STATE_ALIASES = {
  up: 'Uttar Pradesh', mp: 'Madhya Pradesh', hp: 'Himachal Pradesh', ap: 'Andhra Pradesh', tn: 'Tamil Nadu',
  wb: 'West Bengal', jk: 'Jammu and Kashmir', uk: 'Uttarakhand', uttaranchal: 'Uttarakhand', orissa: 'Odisha',
  pondicherry: 'Puducherry', 'nct of delhi': 'Delhi', 'new delhi': 'Delhi', 'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu', 'andaman and nicobar': 'Andaman and Nicobar Islands',
}

function withinTwoEdits(a, b) {
  if (Math.abs(a.length - b.length) > 2) return false
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length] <= 2
}

/**
 * Official state / UT name for a typed one: "UP", "U.P" and "Uttar Pardesh" all become "Uttar Pradesh".
 * Text that is not a state (a district or city typed into the State box, e.g. "Bahraich") gives '' so it
 * never shows up as a state.
 */
export function canonState(s) {
  const key = stateKey((s ?? '').toString())
  if (!key) return ''
  const exact = STATE_BY_KEY.get(key) ?? STATE_ALIASES[key]
  if (exact) return exact
  if (key.length > 5) for (const [k, name] of STATE_BY_KEY) if (withinTwoEdits(key, k)) return name
  return ''
}

/** Example queries for the composer, built from the data actually loaded. */
export function exampleQueries() {
  const [s1, s2] = vocab.skills
  const city = vocab.cities[0]
  const role = vocab.roles[0]
  const out = []
  if (role && city) out.push(`${role} in ${city} with 2–6 years experience${s1 ? `, ${s1}` : ''}`)
  if (s1 && s2) out.push(`${s1} and ${s2}, available within 30 days`)
  if (s1) out.push(`${s1} developers, verified profiles only`)
  return out
}
