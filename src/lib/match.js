// The backend has no employer-side match score, so "match" is computed on-device from real
// data: the share of the required skills (a job's skills, or the skills being searched)
// that the candidate lists. Returns null when there's nothing to compare — callers hide the
// indicator rather than show an invented number.
const norm = (s) => String(s).trim().toLowerCase()

export function skillMatch(candidateSkills, requiredSkills) {
  const have = new Set((candidateSkills ?? []).map(norm).filter(Boolean))
  const need = [...new Set((requiredSkills ?? []).map(norm).filter(Boolean))]
  if (!have.size || !need.length) return null
  const matched = need.filter((s) => have.has(s))
  return { pct: Math.round((matched.length / need.length) * 100), matched, missing: need.filter((s) => !have.has(s)) }
}

export const matchTone = (pct) => (pct >= 75 ? 'green' : pct >= 50 ? 'navy' : 'amber')
