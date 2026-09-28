// Matching, trust and ranking. Pure functions over the Candidate shape (see
// demoPool.js) — the same code ranks demo data and mapped live data.
//
// Match scores are rule-based and every number is derived from a visible
// comparison against what the recruiter asked for, so "Why this candidate
// matches" can be checked by hand. Only dimensions the recruiter actually
// specified are scored; with no scorable criteria a candidate has no match
// score (`overall === null`) rather than a made-up one.

import { canonCity } from './vocab'
import { evalBool, collectTerms } from './boolean'

const norm = (s) => (s ?? '').toString().trim().toLowerCase()
const GENERIC = new Set(['developer', 'engineer', 'senior', 'junior', 'lead', 'associate', 'staff', 'the', 'and'])

const WEIGHTS = { skills: 0.35, experience: 0.2, location: 0.15, industry: 0.1, salary: 0.1, availability: 0.1 }
export const MATCH_LABELS = {
  skills: 'Skills match',
  experience: 'Experience match',
  location: 'Location match',
  industry: 'Industry match',
  salary: 'Salary match',
  availability: 'Availability',
}

function roleTokens(role) {
  const t = norm(role).split(/[\s/-]+/).filter(Boolean)
  const specific = t.filter((w) => !GENERIC.has(w))
  return specific.length ? specific : t
}

export function roleMatches(candidate, role) {
  if (!role) return true
  const hay = norm([candidate.designation, ...candidate.workHistory.map((w) => w.role), ...candidate.skills].join(' '))
  return roleTokens(role).every((w) => hay.includes(w))
}

function locationScore(c, want) {
  if (!want.length) return null
  const w = want.map(canonCity)
  if (w.includes(canonCity(c.location))) return 100
  if (c.preferredLocations.some((l) => w.includes(canonCity(l)))) return 85
  return 40
}

/** @returns {{overall:number|null, parts:Record<string,number|null>, strong:string[], weak:string[], notes:string[]}} */
export function computeMatch(c, crit) {
  const parts = { skills: null, experience: null, location: null, industry: null, salary: null, availability: null }
  const strong = []
  const weak = []
  const notes = []

  const wanted = crit.skills
  if (wanted.length) {
    const have = new Set(c.skills.map(norm))
    const hit = wanted.filter((s) => have.has(norm(s)))
    parts.skills = Math.round((hit.length / wanted.length) * 100)
    strong.push(...hit)
    weak.push(...wanted.filter((s) => !have.has(norm(s))))
  }
  if (crit.expMin != null || crit.expMax != null) {
    const lo = crit.expMin ?? 0
    const hi = crit.expMax ?? lo + 100
    const y = c.experienceYears
    if (y >= lo && y <= hi) parts.experience = 100
    else {
      const d = y < lo ? lo - y : y - hi
      parts.experience = Math.max(30, Math.round(100 - d * 18))
      notes.push(y < lo ? `${d} yrs below your range` : `${d} yrs above your range`)
    }
  }
  parts.location = locationScore(c, crit.locations)
  if (parts.location != null && parts.location < 85) notes.push(`Not based in or open to ${crit.locations.join(' / ')}`)
  if (crit.industry) {
    parts.industry = norm(c.industry) === norm(crit.industry) ? 100 : 55
    if (parts.industry < 100) notes.push(`Limited ${crit.industry} background`)
  }
  if (crit.salaryMax != null || crit.salaryMin != null) {
    const ex = c.expectedSalaryLPA
    if (ex == null) parts.salary = null
    else if ((crit.salaryMax == null || ex <= crit.salaryMax) && (crit.salaryMin == null || ex >= crit.salaryMin)) parts.salary = 100
    else {
      const over = crit.salaryMax != null && ex > crit.salaryMax ? (ex - crit.salaryMax) / crit.salaryMax : 0.1
      parts.salary = Math.max(30, Math.round(100 - over * 200))
      notes.push(`Expects ${ex} LPA`)
    }
  }
  if (crit.noticeMax != null && c.noticePeriodDays != null) {
    const over = c.noticePeriodDays - crit.noticeMax
    parts.availability = over <= 0 ? 100 : Math.max(35, Math.round(100 - over * 1.5))
    if (over > 0) notes.push(`${c.noticePeriodDays}-day notice period`)
  }

  const active = Object.entries(parts).filter(([, v]) => v != null)
  const overall = active.length ? Math.round(active.reduce((s, [k, v]) => s + WEIGHTS[k] * v, 0) / active.reduce((s, [k]) => s + WEIGHTS[k], 0)) : null
  return { overall, parts, strong, weak, notes }
}

export const TRUST_DIMENSIONS = [
  { key: 'identity', label: 'Identity verification', weight: 20 },
  { key: 'contact', label: 'Contact verification', weight: 15 },
  { key: 'education', label: 'Education verification', weight: 15 },
  { key: 'employment', label: 'Employment verification', weight: 20 },
  { key: 'resumeConsistency', label: 'Resume consistency', weight: 10 },
  { key: 'completeness', label: 'Profile completeness', weight: 10 },
  { key: 'activity', label: 'Recent activity', weight: 10 },
]
const POINTS = { verified: 1, pending: 0.4, none: 0 }

/**
 * Trust reads only real verification states off the candidate. Contact is
 * "verified" only when BOTH phone and email are; one of two shows as pending.
 * Completeness and activity are derived facts, not verifications, and are
 * labelled as such in the UI.
 * @returns {{score:number, rows:{key,label,status,detail}[]}}
 */
export function computeTrust(c) {
  const v = c.verification
  const contact = v.phone === 'verified' && v.email === 'verified' ? 'verified' : v.phone === 'none' && v.email === 'none' ? 'none' : 'pending'
  const status = {
    identity: v.identity,
    contact,
    education: v.education,
    employment: v.employment,
    resumeConsistency: v.resumeConsistency,
    completeness: c.profileCompleteness >= 80 ? 'verified' : c.profileCompleteness >= 50 ? 'pending' : 'none',
    activity: c.lastActiveDaysAgo == null ? 'none' : c.lastActiveDaysAgo <= 14 ? 'verified' : c.lastActiveDaysAgo <= 60 ? 'pending' : 'none',
  }
  const detail = {
    contact: `Phone ${v.phone === 'verified' ? 'verified' : 'not verified'} · Email ${v.email === 'verified' ? 'verified' : 'not verified'}`,
    completeness: `${c.profileCompleteness}% complete`,
    activity: c.lastActiveDaysAgo == null ? 'Activity is not tracked for this profile' : `Last active ${c.lastActiveDaysAgo === 0 ? 'today' : `${c.lastActiveDaysAgo} days ago`}`,
  }
  let total = 0
  const rows = TRUST_DIMENSIONS.map((d) => {
    total += d.weight * POINTS[status[d.key]]
    return { key: d.key, label: d.label, status: status[d.key], detail: detail[d.key] ?? null }
  })
  return { score: Math.round(total), rows }
}

function textFor(c, scope) {
  if (scope === 'title') return `${c.designation} ${c.workHistory.map((w) => w.role).join(' ')}`
  if (scope === 'skills') return c.skills.join(' ')
  if (scope === 'experience') return c.workHistory.map((w) => `${w.role} ${w.company} ${(w.skills ?? []).join(' ')}`).join(' ')
  return [c.name, c.designation, c.currentCompany, c.summary, c.skills.join(' '), c.workHistory.map((w) => `${w.role} ${w.company}`).join(' '), c.projects.map((p) => `${p.name} ${p.description}`).join(' '), c.education.map((e) => `${e.degree} ${e.institute}`).join(' ')].join(' ')
}

function passes(c, crit, trust, exclude) {
  if (exclude?.has(c.id)) return false
  const hay = norm(textFor(c, crit.scope))
  if (crit.keywords.some((k) => !hay.includes(norm(k)))) return false
  if (crit.keywordGroups.some((g) => !g.some((k) => hay.includes(norm(k))))) return false
  if (crit.boolExpr && !evalBool(crit.boolExpr, c, (x) => textFor(x, crit.scope))) return false
  if (crit.exclude.some((k) => norm(textFor(c, 'all')).includes(norm(k)))) return false
  if (crit.anyKeywords.length && !crit.anyKeywords.some((k) => hay.includes(norm(k)))) return false
  if (!roleMatches(c, crit.role)) return false
  if (crit.skills.length) {
    const have = new Set(c.skills.map(norm))
    const test = (s) => have.has(norm(s))
    if (!(crit.skillsMode === 'all' ? crit.skills.every(test) : crit.skills.some(test))) return false
  }
  if (crit.expMin != null && c.experienceYears < crit.expMin) return false
  if (crit.expMax != null && c.experienceYears > crit.expMax) return false
  if (crit.locations.length) {
    const w = crit.locations.map(canonCity)
    const here = w.includes(canonCity(c.location))
    const willing = c.preferredLocations.some((l) => w.includes(canonCity(l)))
    if (!here && !(crit.alsoPreferred !== false && willing)) return false
  }
  if (crit.prefLocations.length) {
    const w = crit.prefLocations.map(canonCity)
    if (!c.preferredLocations.some((l) => w.includes(canonCity(l))) && !w.includes(canonCity(c.location))) return false
  }
  if (crit.relocate && !c.relocationOk && !c.preferredLocations.some((l) => canonCity(l) !== canonCity(c.location))) return false
  if ((crit.curSalaryMin != null || crit.curSalaryMax != null) && c.currentSalaryLPA == null) return false
  if (crit.curSalaryMin != null && c.currentSalaryLPA < crit.curSalaryMin) return false
  if (crit.curSalaryMax != null && c.currentSalaryLPA > crit.curSalaryMax) return false
  if (crit.designation && !norm(c.designation).includes(norm(crit.designation))) return false
  if (crit.department && norm(c.department) !== norm(crit.department)) return false
  if (crit.employmentType && !(c.employmentTypes ?? [c.employmentType]).includes(crit.employmentType)) return false
  if (crit.gender && c.gender !== crit.gender) return false
  if (crit.prevCompany && !c.workHistory.slice(1).some((w) => norm(w.company).includes(norm(crit.prevCompany)))) return false
  if (crit.degree && !c.education.some((e) => norm(e.degree).includes(norm(crit.degree)))) return false
  if (crit.institute && !c.education.some((e) => norm(e.institute).includes(norm(crit.institute)))) return false
  if (crit.gradFrom != null || crit.gradTo != null) {
    if (!c.education.some((e) => e.year != null && (crit.gradFrom == null || e.year >= crit.gradFrom) && (crit.gradTo == null || e.year <= crit.gradTo))) return false
  }
  if (crit.languages.length && !crit.languages.every((l) => (c.languages ?? []).some((x) => norm(x) === norm(l)))) return false
  if (crit.hasCertification && !c.certifications?.length) return false
  if (crit.profileMin != null && c.profileCompleteness < crit.profileMin) return false
  if (crit.trustMin != null && trust.score < crit.trustMin) return false
  if (crit.verifiedEducation && c.verification.education !== 'verified') return false
  if (crit.verifiedEmployment && c.verification.employment !== 'verified') return false
  if ((crit.salaryMin != null || crit.salaryMax != null) && c.expectedSalaryLPA == null) return false
  if (crit.salaryMin != null && c.expectedSalaryLPA < crit.salaryMin) return false
  if (crit.salaryMax != null && c.expectedSalaryLPA > crit.salaryMax) return false
  if (crit.noticeMax != null && (c.noticePeriodDays == null || c.noticePeriodDays > crit.noticeMax)) return false
  if (crit.industry && norm(c.industry) !== norm(crit.industry)) return false
  if (crit.companyType && c.companyType !== crit.companyType) return false
  if (crit.workMode && !(c.workModes ?? [c.workMode]).includes(crit.workMode)) return false
  if (crit.education && !norm(c.education.map((e) => `${e.degree} ${e.institute}`).join(' ')).includes(norm(crit.education))) return false
  if (crit.company && !norm(c.currentCompany).includes(norm(crit.company))) return false
  if (crit.forJobId && c.jobId !== crit.forJobId) return false
  if (crit.stage && c.stage !== crit.stage) return false
  if (crit.cvAccess && !!c._live?.unlocked !== (crit.cvAccess === 'unlocked')) return false
  if (crit.hasPortfolio && !c.hasPortfolio) return false
  if (crit.hasVideo && !c.hasVideo) return false
  if (crit.verifiedOnly && c.verification.identity !== 'verified') return false
  if (crit.contactVerified && !(c.verification.phone === 'verified' && c.verification.email === 'verified')) return false
  if (crit.resumeFreshDays != null && (c.resumeUpdatedDaysAgo == null || c.resumeUpdatedDaysAgo > crit.resumeFreshDays)) return false
  if (crit.activeDays != null && (c.lastActiveDaysAgo == null || c.lastActiveDaysAgo > crit.activeDays)) return false
  return true
}

// Unknown values sort last.
const days = (v) => (v == null ? Number.MAX_SAFE_INTEGER : v)

const SORTERS = {
  relevance: (a, b) => (b.match.overall ?? 0) - (a.match.overall ?? 0) || b.kw - a.kw || b.trust.score - a.trust.score || days(a.candidate.lastActiveDaysAgo ?? a.candidate.sharedDaysAgo) - days(b.candidate.lastActiveDaysAgo ?? b.candidate.sharedDaysAgo),
  match: (a, b) => (b.match.overall ?? -1) - (a.match.overall ?? -1),
  experience: (a, b) => b.candidate.experienceYears - a.candidate.experienceYears,
  active: (a, b) => days(a.candidate.lastActiveDaysAgo ?? a.candidate.sharedDaysAgo) - days(b.candidate.lastActiveDaysAgo ?? b.candidate.sharedDaysAgo),
  updated: (a, b) => days(a.candidate.resumeUpdatedDaysAgo ?? a.candidate.sharedDaysAgo) - days(b.candidate.resumeUpdatedDaysAgo ?? b.candidate.sharedDaysAgo),
  salary: (a, b) => days(a.candidate.expectedSalaryLPA) - days(b.candidate.expectedSalaryLPA),
  notice: (a, b) => days(a.candidate.noticePeriodDays) - days(b.candidate.noticePeriodDays),
}

/** How many times the recruiter's free-text terms appear — a tiebreaker for text searches with no scored dimensions. */
function keywordScore(c, crit) {
  const terms = [...crit.keywords, ...crit.keywordGroups.flat(), ...collectTerms(crit.boolExpr)]
  if (!terms.length) return 0
  const hay = norm(textFor(c, crit.scope))
  return terms.reduce((n, t) => n + hay.split(norm(t)).length - 1, 0)
}

/** Filters, scores and sorts a pool. Returns every hit — callers paginate. */
export function rankPool(pool, crit, sort = 'relevance', exclude = null) {
  const rows = []
  for (const candidate of pool) {
    const trust = computeTrust(candidate)
    if (!passes(candidate, crit, trust, exclude)) continue
    const match = computeMatch(candidate, crit)
    if (crit.minMatch != null && (match.overall ?? 0) <= crit.minMatch) continue
    rows.push({ candidate, match, trust, kw: keywordScore(candidate, crit) })
  }
  return rows.sort(SORTERS[sort] ?? SORTERS.relevance)
}

/** Similarity of two candidates, 0–100, across the axes recruiters compare on. */
export function similarity(a, b) {
  const sa = new Set(a.skills.map(norm))
  const sb = new Set(b.skills.map(norm))
  const inter = [...sa].filter((s) => sb.has(s)).length
  const jaccard = inter / (new Set([...sa, ...sb]).size || 1)
  const ta = new Set(roleTokens(a.designation))
  const roleSim = roleTokens(b.designation).filter((w) => ta.has(w)).length / (Math.max(ta.size, roleTokens(b.designation).length) || 1)
  const exp = Math.max(0, 1 - Math.abs(a.experienceYears - b.experienceYears) / 6)
  const loc = canonCity(a.location) === canonCity(b.location) ? 1 : b.preferredLocations.some((l) => canonCity(l) === canonCity(a.location)) ? 0.6 : 0
  const ind = norm(a.industry) === norm(b.industry) ? 1 : 0
  const sal = a.expectedSalaryLPA == null || b.expectedSalaryLPA == null ? 0 : Math.max(0, 1 - Math.abs(a.expectedSalaryLPA - b.expectedSalaryLPA) / 15)
  const edu = norm(a.education[0]?.institute) === norm(b.education[0]?.institute) ? 1 : 0
  const score = jaccard * 0.4 + roleSim * 0.2 + exp * 0.13 + loc * 0.08 + ind * 0.07 + sal * 0.07 + edu * 0.05
  return Math.round(score * 100)
}

export function similarTo(pool, target, limit = 6) {
  return pool
    .filter((c) => c.id !== target.id)
    .map((candidate) => ({ candidate, score: similarity(target, candidate) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Criteria derived from a job, for "Find candidates for this job". */
export function criteriaFromJob(job) {
  return {
    role: job.title ?? '',
    // jobId lets the UI show which job drove this search
    skills: job.requiredSkills ?? [],
    expMin: job.experienceMin ?? null,
    expMax: job.experienceMax ?? null,
    locations: job.locations ?? [],
    salaryMax: job.salaryMaxLPA ?? null,
    noticeMax: job.noticeMax ?? null,
    education: job.education ?? '',
    jobId: job.id,
  }
}

export function matchTone(score) {
  if (score == null) return 'none'
  return score >= 85 ? 'strong' : score >= 65 ? 'good' : 'fair'
}
