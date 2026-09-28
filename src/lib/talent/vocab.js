// The vocabulary the query parser and filter suggestions match against — rebuilt from the
// candidates actually loaded (see services/talent.js), so "React developers in Pune" only
// recognises skills, roles and cities that exist in the data being searched.

export const vocab = {
  skills: [],
  roles: [],
  cities: [],
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
  vocab.industries = uniq(pool.map((c) => c.industry))
  vocab.companyTypes = uniq(pool.map((c) => c.companyType))
  vocab.departments = uniq(pool.map((c) => c.department))
  vocab.degrees = uniq(pool.flatMap((c) => c.education.map((e) => e.degree)))
  vocab.institutes = uniq(pool.flatMap((c) => c.education.map((e) => e.institute)))
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
