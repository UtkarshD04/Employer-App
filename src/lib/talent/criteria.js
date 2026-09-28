import { boolToString } from './boolean'

// SearchCriteria — the single structured description of "who the recruiter
// wants". The composer, the filter panel, saved searches, job-based search and
// the AI parser all read and write this same shape.

export const EMPTY_CRITERIA = {
  q: '',
  mode: 'ai', // 'ai' | 'boolean' | 'keyword'
  scope: 'all', // 'all' | 'title' | 'skills' | 'experience'
  keywords: [],
  keywordGroups: [], // legacy: AND of OR-groups (kept so older saved searches still load)
  boolExpr: null, // Boolean search AST (see boolean.js)
  exclude: [],
  skills: [],
  role: '',
  expMin: null,
  expMax: null,
  locations: [],
  salaryMin: null, // expected salary, LPA
  salaryMax: null,
  noticeMax: null, // days
  industry: '',
  companyType: '',
  workMode: '',
  education: '',
  company: '', // current company
  prevCompany: '',
  designation: '',
  department: '',
  employmentType: '',
  gender: '',
  anyKeywords: [], // at least one of these
  skillsMode: 'any', // 'any' | 'all'
  alsoPreferred: true, // current-location filter also matches people who prefer to relocate there
  prefLocations: [],
  relocate: false,
  curSalaryMin: null,
  curSalaryMax: null,
  degree: '',
  institute: '',
  gradFrom: null,
  gradTo: null,
  languages: [],
  hasCertification: false,
  profileMin: null,
  trustMin: null,
  verifiedEducation: false,
  verifiedEmployment: false,
  hideContacted: false,
  hideShortlisted: false,
  hideViewed: false,
  cvAccess: '', // live: '' | 'unlocked' | 'locked' — whether this company has spent a CV credit on them
  verifiedOnly: false,
  contactVerified: false,
  resumeFreshDays: null,
  activeDays: null,
  minMatch: null,
  jobId: null, // the job a search was derived from (Job Talent) — informational
  forJobId: '', // live: only candidates shared for this job
  forJobTitle: '',
  stage: '', // live: pipeline stage
  hasPortfolio: false,
  hasVideo: false,
}

// Arrays are copied so nothing that mutates a criteria object can leak into
// EMPTY_CRITERIA and every later search.
export function makeCriteria(patch = {}) {
  const c = { ...EMPTY_CRITERIA, ...patch }
  for (const k of ['keywords', 'keywordGroups', 'exclude', 'skills', 'locations', 'anyKeywords', 'prefLocations', 'languages']) c[k] = [...c[k]]
  return c
}

export const SCOPES = [
  { id: 'all', label: 'Entire resume' },
  { id: 'title', label: 'Resume title' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
]

export const SORTS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'match', label: 'AI match' },
  { id: 'experience', label: 'Experience' },
  { id: 'active', label: 'Recently active' },
  { id: 'updated', label: 'Recently updated' },
  { id: 'salary', label: 'Expected salary' },
  { id: 'notice', label: 'Notice period' },
]

export const STAGES = ['shared', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected']
export const STAGE_LABELS = { shared: 'New', shortlisted: 'Shortlisted', interviewing: 'Interviewing', offered: 'Offered', hired: 'Hired', rejected: 'Rejected' }

export const NOTICE_OPTIONS = [
  { value: 0, label: 'Immediate' },
  { value: 15, label: '≤ 15 days' },
  { value: 30, label: '≤ 30 days' },
  { value: 60, label: '≤ 60 days' },
  { value: 90, label: '≤ 90 days' },
]

/** Turns criteria into removable chips. `key` identifies what to clear. */
export function criteriaToChips(c) {
  const chips = []
  if (c.role) chips.push({ key: 'role', label: c.role, group: 'Role' })
  c.skills.forEach((s) => chips.push({ key: `skill:${s}`, label: s, group: 'Skill' }))
  c.keywords.forEach((k) => chips.push({ key: `kw:${k}`, label: k, group: 'Keyword' }))
  if (c.anyKeywords.length) chips.push({ key: 'anykw', label: `Any of: ${c.anyKeywords.join(', ')}`, group: 'Keyword' })
  c.keywordGroups.forEach((g, i) => chips.push({ key: `kwg:${i}`, label: g.join(' OR '), group: 'Boolean' }))
  if (c.boolExpr) chips.push({ key: 'bool', label: boolToString(c.boolExpr), group: 'Boolean', title: 'Boolean expression' })
  c.exclude.forEach((k) => chips.push({ key: `ex:${k}`, label: `Not ${k}`, group: 'Exclude' }))
  if (c.expMin != null || c.expMax != null) {
    const lo = c.expMin ?? 0
    chips.push({ key: 'exp', label: c.expMax != null ? `${lo}–${c.expMax} yrs` : `${lo}+ yrs`, group: 'Experience' })
  }
  c.locations.forEach((l) => chips.push({ key: `loc:${l}`, label: c.alsoPreferred ? l : `${l} (current)`, group: 'Location' }))
  c.prefLocations.forEach((l) => chips.push({ key: `pref:${l}`, label: `Prefers ${l}`, group: 'Location' }))
  if (c.relocate) chips.push({ key: 'relocate', label: 'Open to relocate', group: 'Location' })
  if (c.salaryMin != null || c.salaryMax != null) {
    chips.push({ key: 'salary', label: `₹${c.salaryMin ?? 0}–${c.salaryMax ?? '∞'} LPA`, group: 'Salary' })
  }
  if (c.noticeMax != null) chips.push({ key: 'notice', label: c.noticeMax === 0 ? 'Immediate' : `≤ ${c.noticeMax} days`, group: 'Notice' })
  if (c.curSalaryMin != null || c.curSalaryMax != null) chips.push({ key: 'curSalary', label: `Current ₹${c.curSalaryMin ?? 0}–${c.curSalaryMax ?? '∞'} LPA`, group: 'Salary' })
  if (c.designation) chips.push({ key: 'designation', label: `Role: ${c.designation}`, group: 'Designation' })
  if (c.department) chips.push({ key: 'department', label: c.department, group: 'Department' })
  if (c.employmentType) chips.push({ key: 'employmentType', label: c.employmentType, group: 'Employment' })
  if (c.prevCompany) chips.push({ key: 'prevCompany', label: `Ex-${c.prevCompany}`, group: 'Company' })
  if (c.degree) chips.push({ key: 'degree', label: c.degree, group: 'Education' })
  if (c.institute) chips.push({ key: 'institute', label: c.institute, group: 'Education' })
  if (c.gradFrom != null || c.gradTo != null) chips.push({ key: 'grad', label: `Passed ${c.gradFrom ?? '…'}–${c.gradTo ?? '…'}`, group: 'Education' })
  if (c.gender) chips.push({ key: 'gender', label: c.gender, group: 'Diversity' })
  c.languages.forEach((l) => chips.push({ key: `lang:${l}`, label: l, group: 'Language' }))
  if (c.hasCertification) chips.push({ key: 'hasCertification', label: 'Certified', group: 'Quality' })
  if (c.profileMin != null) chips.push({ key: 'profileMin', label: `Profile ≥ ${c.profileMin}%`, group: 'Quality' })
  if (c.trustMin != null) chips.push({ key: 'trustMin', label: `Trust ≥ ${c.trustMin}`, group: 'Quality' })
  if (c.verifiedEducation) chips.push({ key: 'verifiedEducation', label: 'Education verified', group: 'Quality' })
  if (c.verifiedEmployment) chips.push({ key: 'verifiedEmployment', label: 'Employment verified', group: 'Quality' })
  if (c.hideContacted) chips.push({ key: 'hideContacted', label: 'Hide contacted', group: 'Hide' })
  if (c.hideShortlisted) chips.push({ key: 'hideShortlisted', label: 'Hide shortlisted', group: 'Hide' })
  if (c.hideViewed) chips.push({ key: 'hideViewed', label: 'Hide viewed', group: 'Hide' })
  if (c.cvAccess) chips.push({ key: 'cvAccess', label: c.cvAccess === 'unlocked' ? 'CV unlocked' : 'CV not unlocked', group: 'CV access' })
  if (c.industry) chips.push({ key: 'industry', label: c.industry, group: 'Industry' })
  if (c.companyType) chips.push({ key: 'companyType', label: c.companyType, group: 'Company' })
  if (c.workMode) chips.push({ key: 'workMode', label: c.workMode, group: 'Work mode' })
  if (c.education) chips.push({ key: 'education', label: c.education, group: 'Education' })
  if (c.company) chips.push({ key: 'company', label: c.company, group: 'Company' })
  if (c.forJobId) chips.push({ key: 'forJob', label: `Job: ${c.forJobTitle || 'selected'}`, group: 'Job' })
  if (c.stage) chips.push({ key: 'stage', label: `Stage: ${STAGE_LABELS[c.stage] ?? c.stage}`, group: 'Pipeline' })
  if (c.hasPortfolio) chips.push({ key: 'hasPortfolio', label: 'Has portfolio', group: 'Quality' })
  if (c.hasVideo) chips.push({ key: 'hasVideo', label: 'Video intro', group: 'Quality' })
  if (c.verifiedOnly) chips.push({ key: 'verifiedOnly', label: 'Verified profile', group: 'Quality' })
  if (c.contactVerified) chips.push({ key: 'contactVerified', label: 'Verified contact', group: 'Quality' })
  if (c.resumeFreshDays != null) chips.push({ key: 'resumeFresh', label: `Resume ≤ ${c.resumeFreshDays}d old`, group: 'Quality' })
  if (c.activeDays != null) chips.push({ key: 'active', label: `Active ≤ ${c.activeDays}d`, group: 'Activity' })
  if (c.minMatch != null) chips.push({ key: 'minMatch', label: `AI match > ${c.minMatch}`, group: 'AI' })
  return chips
}

export function removeChip(c, key) {
  const n = { ...c }
  if (key === 'role') n.role = ''
  else if (key.startsWith('skill:')) n.skills = c.skills.filter((s) => s !== key.slice(6))
  else if (key.startsWith('kw:')) n.keywords = c.keywords.filter((s) => s !== key.slice(3))
  else if (key.startsWith('kwg:')) n.keywordGroups = c.keywordGroups.filter((_, i) => i !== Number(key.slice(4)))
  else if (key.startsWith('ex:')) n.exclude = c.exclude.filter((s) => s !== key.slice(3))
  else if (key === 'exp') { n.expMin = null; n.expMax = null }
  else if (key.startsWith('loc:')) n.locations = c.locations.filter((s) => s !== key.slice(4))
  else if (key === 'salary') { n.salaryMin = null; n.salaryMax = null }
  else if (key === 'notice') n.noticeMax = null
  else if (key === 'anykw') n.anyKeywords = []
  else if (key.startsWith('pref:')) n.prefLocations = c.prefLocations.filter((s) => s !== key.slice(5))
  else if (key.startsWith('lang:')) n.languages = c.languages.filter((s) => s !== key.slice(5))
  else if (key === 'curSalary') { n.curSalaryMin = null; n.curSalaryMax = null }
  else if (key === 'grad') { n.gradFrom = null; n.gradTo = null }
  else if (key === 'bool') { n.boolExpr = null; n.q = '' }
  else if (key === 'forJob') { n.forJobId = ''; n.forJobTitle = '' }
  else if (key === 'resumeFresh') n.resumeFreshDays = null
  else if (key === 'active') n.activeDays = null
  else if (key in n) n[key] = EMPTY_CRITERIA[key]
  return n
}

/** Everything except paging/presentation — used to decide "is there a search?" */
export function hasActiveCriteria(c) {
  return criteriaToChips(c).length > 0 || !!c.q.trim()
}

export function criteriaTitle(c) {
  const parts = []
  if (c.role) parts.push(c.role)
  else if (c.skills.length) parts.push(c.skills.slice(0, 2).join(' + '))
  else if (c.keywords.length) parts.push(c.keywords.slice(0, 2).join(' '))
  else if (c.q.trim()) parts.push(c.q.trim().slice(0, 40))
  if (c.locations.length) parts.push(c.locations.slice(0, 2).join(', '))
  if (c.expMin != null || c.expMax != null) parts.push(`${c.expMin ?? 0}–${c.expMax ?? '+'} yrs`)
  return parts.join(' · ') || 'Untitled search'
}
