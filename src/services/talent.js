// The one seam between the recruiter UI and its data.
//
// Reads the employer API: every page of `GET /resume-search` (the
//         Resdex-style database of every verified candidate on Mzobs), every
//         page of `GET /candidates` (people already in THIS company's
//         pipeline), and `GET /jobs` for job-based search and the Job filter.
//         A person in both lists is one row: the database profile, carrying
//         the company's pipeline state for them.

import { apiClient, fetchAll as fetchAllPages } from '../lib/api'
import { revealedFromApi } from '../lib/reveal'
import { rankPool, similarTo, computeMatch, computeTrust } from '../lib/talent/engine'
import { setVocabularyFrom } from '../lib/talent/vocab'

// ---- live mapping ---------------------------------------------------------

function firstNumber(s) {
  const m = String(s ?? '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : null
}

/** "₹500000" → 5, "8" → 8, "12 LPA" → 12. Backend stores annual rupees or lakhs depending on the source. */
export function toLpa(s) {
  const n = firstNumber(s)
  if (n == null) return null
  return n >= 1000 ? Math.round((n / 100000) * 10) / 10 : n
}

/** "Immediate" → 0, "15 days" → 15, "2 months" → 60, "30" → 30, "" → null (unknown, never guessed). */
export function toNoticeDays(s) {
  const t = String(s ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/immediate|now|none/.test(t)) return 0
  const n = firstNumber(t)
  if (n == null) return null
  if (/month/.test(t)) return n * 30
  if (/week/.test(t)) return n * 7
  return n
}

const daysSince = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null)

function mapHistory(workHistory) {
  return (workHistory ?? []).map((w) => {
    const yrs = String(w.duration ?? '').match(/(\d{4})\D+(\d{4}|present|current|now)/i)
    return { role: w.role, company: w.company, startYear: yrs ? Number(yrs[1]) : null, endYear: yrs && /\d/.test(yrs[2]) ? Number(yrs[2]) : null, duration: w.duration, skills: [], location: '' }
  })
}

/** Maps an API `Candidate` (Backend/src/models/Candidate.js) to the UI shape. Unknown → null/empty, never invented. */
export function mapApiCandidate(c, jobTitles = {}) {
  const hist = mapHistory(c.workHistory)
  const filled = [c.headline, c.location, c.skills?.length, c.education?.length, c.workHistory?.length, c.projects?.length, c.expectedSalary, c.portfolioLink, c.hasVideoIntro]
  return {
    id: c.id,
    name: c.name,
    initials: c.initials,
    designation: c.headline || c.appliedFor || '',
    appliedFor: c.appliedFor || '',
    currentCompany: hist[0]?.company ?? '',
    experienceYears: c.experienceYears ?? 0,
    currentSalaryLPA: null,
    expectedSalaryLPA: toLpa(c.expectedSalary),
    location: c.location ?? '',
    preferredLocations: c.location ? [c.location] : [],
    noticePeriodDays: toNoticeDays(c.availability),
    skills: c.skills ?? [],
    industry: '',
    companyType: '',
    workMode: '',
    employmentType: '',
    education: (c.education ?? []).map((e) => ({ degree: e.degree, institute: e.institute, year: Number(e.year) || null })),
    workHistory: hist,
    projects: (c.projects ?? []).map((p) => ({ name: p.name, description: p.description })),
    certifications: c.certificates ? [`${c.certificates} certificate${c.certificates === 1 ? '' : 's'} on profile`] : [],
    languages: [],
    summary: '',
    hasPortfolio: !!(c.hasPortfolio || c.portfolioLink),
    portfolioLink: c.portfolioLink || '',
    hasVideo: !!c.hasVideoIntro,
    // The backend records when a profile was shared with the company, not when the candidate was last active.
    lastActiveDaysAgo: null,
    resumeUpdatedDaysAgo: null,
    sharedDaysAgo: daysSince(c.sharedOn ?? c.createdAt),
    profileCompleteness: Math.round((filled.filter(Boolean).length / filled.length) * 100),
    verification: {
      identity: c.identityVerified ? 'verified' : 'none',
      phone: 'none',
      email: 'none',
      education: 'none',
      employment: 'none',
      resumeConsistency: c.resumeVerified ? 'verified' : 'none',
    },
    source: c.source ?? 'Mzobs Verified Pool',
    jobId: c.jobId ?? null,
    jobTitle: jobTitles[c.jobId] ?? c.appliedFor ?? '',
    stage: c.stage ?? 'shared',
    rejectionReason: c.rejectionReason ?? null,
    contact: c.unlocked ? { email: c.email, phone: c.phone } : null,
    links: [],
    _live: { kind: 'applicant', candidateId: c.id, employeeId: c.employeeId ?? null, stage: c.stage, unlocked: !!c.unlocked, revealed: revealedFromApi(c), contactPreview: c.contactPreview },
  }
}

/** Maps a `GET /resume-search` profile (employerResumeSearchController.redactEmployee) to the UI shape. */
export function mapResdexCandidate(e) {
  const hist = mapHistory(e.workHistory)
  const workModes = e.workModePreference ?? []
  const employmentTypes = e.jobTypePreference ?? []
  const links = [['Portfolio', e.portfolioLink], ['LinkedIn', e.linkedin], ['GitHub', e.github]].filter(([, url]) => url).map(([label, url]) => ({ label, url }))
  const filled = [e.headline, e.location, e.skills?.length, e.education?.length, e.workHistory?.length, e.projects?.length, e.expectedSalary, e.currentCtc, e.noticePeriod, links.length]
  return {
    id: e.id,
    name: e.name,
    initials: e.initials,
    designation: e.designation || e.preferredRole || e.headline || '',
    appliedFor: '',
    currentCompany: e.currentCompany || hist[0]?.company || '',
    experienceYears: e.experienceYears ?? 0,
    currentSalaryLPA: toLpa(e.currentCtc),
    expectedSalaryLPA: toLpa(e.expectedSalary),
    location: e.location ?? '',
    preferredLocations: e.preferredLocations?.length ? e.preferredLocations : e.location ? [e.location] : [],
    relocationOk: e.relocationOk,
    noticePeriodDays: toNoticeDays(e.noticePeriod),
    skills: e.skills ?? [],
    industry: '',
    companyType: '',
    workMode: workModes.join(' / '),
    workModes,
    employmentType: employmentTypes.join(' / '),
    employmentTypes,
    education: (e.education ?? []).map((x) => ({ degree: x.degree, institute: x.institute, year: Number(x.year) || null })),
    workHistory: hist,
    projects: (e.projects ?? []).map((p) => ({ name: p.name, description: p.description, tech: p.tech ?? [] })),
    certifications: [],
    languages: [],
    summary: e.headline || '',
    hasPortfolio: !!e.portfolioLink,
    portfolioLink: e.portfolioLink || '',
    hasVideo: false,
    lastActiveDaysAgo: daysSince(e.lastActiveAt),
    resumeUpdatedDaysAgo: daysSince(e.resumeUpdatedOn),
    sharedDaysAgo: null,
    profileCompleteness: Math.round((filled.filter(Boolean).length / filled.length) * 100),
    verification: {
      identity: 'none',
      phone: e.phoneVerified ? 'verified' : 'none',
      email: e.emailVerified ? 'verified' : 'none',
      education: 'none',
      employment: 'none',
      resumeConsistency: e.resumeVerified ? 'verified' : 'none',
    },
    source: 'Mzobs resume database',
    premium: !!e.premium,
    jobId: null,
    jobTitle: '',
    stage: null,
    rejectionReason: null,
    contact: e.unlocked ? { email: e.email, phone: e.phone } : null,
    links,
    _live: { kind: 'resdex', candidateId: e.candidateId ?? null, employeeId: e.employeeId, stage: null, unlocked: !!e.unlocked, revealed: revealedFromApi(e), contactPreview: e.contactPreview },
  }
}

/**
 * One row per person. A database profile that is also in the company's
 * pipeline keeps the profile's id and richer fields and takes the pipeline
 * state (job, stage, unlock) from the Candidate row, so its id doesn't change
 * when the recruiter unlocks or shortlists them.
 */
function mergePool(applicants, resdex) {
  const byEmployee = new Map(resdex.map((r) => [r._live.employeeId, r]))
  const used = new Set()
  const merged = applicants.map((a) => {
    const r = a._live.employeeId ? byEmployee.get(a._live.employeeId) : null
    if (!r || used.has(r.id)) return a
    used.add(r.id)
    return {
      ...r,
      appliedFor: a.appliedFor,
      jobId: a.jobId,
      jobTitle: a.jobTitle,
      stage: a.stage,
      rejectionReason: a.rejectionReason,
      sharedDaysAgo: a.sharedDaysAgo,
      source: a.source,
      hasVideo: a.hasVideo,
      certifications: a.certifications,
      verification: { ...r.verification, identity: a.verification.identity },
      contact: a.contact ?? r.contact,
      _live: { ...r._live, kind: 'applicant', candidateId: a._live.candidateId, stage: a._live.stage, unlocked: a._live.unlocked || r._live.unlocked, revealed: a._live.unlocked ? a._live.revealed : r._live.revealed, contactPreview: a._live.contactPreview ?? r._live.contactPreview },
    }
  })
  return [...merged, ...resdex.filter((r) => !used.has(r.id))]
}

// ---- pool ----------------------------------------------------------------

/** What the loaded data can actually be filtered/sorted on — drives which filters the UI offers. */
export function poolMeta(pool, jobs = []) {
  const any = (fn) => pool.some(fn)
  const jobIds = new Set(pool.map((c) => c.jobId).filter(Boolean))
  return {
    total: pool.length,
    shared: pool.filter((c) => c._live?.kind === 'applicant').length,
    notice: any((c) => c.noticePeriodDays != null),
    salary: any((c) => c.expectedSalaryLPA != null),
    industry: any((c) => c.industry),
    companyType: any((c) => c.companyType),
    workMode: any((c) => c.workMode),
    activity: any((c) => c.lastActiveDaysAgo != null),
    resumeDate: any((c) => c.resumeUpdatedDaysAgo != null),
    contactVerified: any((c) => c.verification.phone !== 'none' || c.verification.email !== 'none'),
    education: any((c) => c.education.length),
    company: any((c) => c.currentCompany),
    prevCompany: any((c) => c.workHistory.length > 1),
    designation: any((c) => c.designation),
    department: any((c) => c.department),
    employmentType: any((c) => c.employmentType),
    gender: any((c) => c.gender),
    languages: any((c) => c.languages?.length),
    certifications: any((c) => c.certifications?.length),
    currentSalary: any((c) => c.currentSalaryLPA != null),
    gradYear: any((c) => c.education.some((e) => e.year)),
    institute: any((c) => c.education.some((e) => e.institute)),
    degree: any((c) => c.education.some((e) => e.degree)),
    relocation: any((c) => c.relocationOk != null || c.preferredLocations.length > 1),
    portfolio: any((c) => c.hasPortfolio),
    video: any((c) => c.hasVideo),
    pipeline: true,
    jobs: jobs.filter((j) => jobIds.has(j.id)).map((j) => ({ id: j.id, title: j.title })),
    stages: [...new Set(pool.map((c) => c.stage).filter(Boolean))],
  }
}

let pool = null // { rows, jobs, at }
let poolPromise = null
const cache = new Map()
const POOL_TTL = 5 * 60_000

/** Every page of a list endpoint (pagination rides on X-Total-Count), capped at maxPages × 200 rows. */
export const fetchAll = (path, maxPages) => fetchAllPages(path, { limit: 200, maxPages })

function loadPool(force = false) {
  if (!force && pool && Date.now() - pool.at < POOL_TTL) return Promise.resolve(pool)
  if (!force && poolPromise) return poolPromise
  poolPromise = Promise.all([fetchAll('/candidates', 25), fetchAll('/resume-search', 25), fetchAll('/jobs', 10).catch(() => [])])
    .then(([cands, profiles, jobs]) => {
      const titles = Object.fromEntries(jobs.map((j) => [j.id, j.title]))
      const rows = mergePool(
        cands.map((c) => mapApiCandidate(c, titles)),
        profiles.map(mapResdexCandidate)
      )
      setVocabularyFrom(rows)
      pool = { rows, jobs, at: Date.now() }
      cache.clear()
      return pool
    })
    .finally(() => {
      poolPromise = null
    })
  return poolPromise
}

/** Drops cached data (after unlock / stage change) so the next read is fresh. */
export function invalidatePool() {
  pool = null
  cache.clear()
}

export async function refreshPool() {
  invalidatePool()
  return getPoolMeta(true)
}

export async function getPoolMeta(force = false) {
  const p = await loadPool(force)
  return { ...poolMeta(p.rows, p.jobs), syncedAt: p.at }
}

// ---- search ---------------------------------------------------------------

const CACHE_TTL = 60_000

/**
 * `ids` is every hit in ranked order (not just this page), for Previous / Next on the profile.
 * @returns {Promise<{items: {candidate, match, trust}[], ids:string[], total:number, page:number, hasMore:boolean}>}
 */
export async function searchTalent(criteria, { sort = 'relevance', page = 1, pageSize = 20, exclude = null } = {}) {
  const k = JSON.stringify([criteria, sort, exclude ? [...exclude].sort() : null])
  let hit = cache.get(k)
  if (!hit || Date.now() - hit.at > CACHE_TTL) {
    const p = await loadPool()
    hit = { at: Date.now(), rows: rankPool(p.rows, criteria, sort, exclude) }
    cache.set(k, hit)
    if (cache.size > 40) cache.delete(cache.keys().next().value)
  }
  const start = (page - 1) * pageSize
  hit.ids ??= hit.rows.map((r) => r.candidate.id)
  return { items: hit.rows.slice(start, start + pageSize), ids: hit.ids, total: hit.rows.length, page, hasMore: start + pageSize < hit.rows.length }
}

// Links and shortlists saved before a person's Candidate row was merged into
// their database profile still carry the Candidate id, so both ids resolve.
const hasId = (c, id) => c.id === id || c._live?.candidateId === id

export async function getTalent(id) {
  const p = await loadPool()
  const hit = p.rows.find((c) => hasId(c, id))
  if (hit) return hit
  // Past the loaded pool's cap (or joined since it loaded): ask the database directly.
  try {
    return mapResdexCandidate((await apiClient.get(`/resume-search/${id}`)).data)
  } catch {
    return null
  }
}

export async function getTalentMany(ids) {
  const p = await loadPool()
  return ids.map((id) => p.rows.find((c) => hasId(c, id))).filter(Boolean)
}

export async function findSimilar(id, limit = 6) {
  const p = await loadPool()
  const target = p.rows.find((c) => c.id === id)
  if (!target) return []
  return similarTo(p.rows, target, limit).map(({ candidate, score }) => ({ candidate, score, trust: computeTrust(candidate) }))
}

export function scoreCandidate(candidate, criteria) {
  return { match: computeMatch(candidate, criteria), trust: computeTrust(candidate) }
}

// ---- jobs (job-based talent search) ----------------------------------------

/** Backend job → Job Talent shape. Salary is annual rupees in the API. */
export function mapApiJob(j) {
  const lpa = (n) => (n == null ? null : n >= 1000 ? Math.round((n / 100000) * 10) / 10 : n)
  return {
    id: j.id,
    title: j.title,
    status: j.status,
    requiredSkills: j.skills ?? [],
    preferredSkills: [],
    experienceMin: j.experienceMin,
    experienceMax: j.experienceMax,
    locations: j.location && !/^remote$/i.test(j.location) ? [j.location] : [],
    workMode: j.workMode,
    salaryMaxLPA: lpa(j.salaryMax),
    education: '',
    noticeMax: null,
  }
}

export async function listJobs() {
  const p = await loadPool()
  return p.jobs.map(mapApiJob)
}
