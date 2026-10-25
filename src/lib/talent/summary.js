// Professional summary for the candidate card, built only from data the search
// response already carries (parsed profile fields + the CV's own words). No
// network or AI call; results are cached per candidate. Contact details and
// links are scrubbed so nothing protected behind the unlock flow can leak.

const HEADING = /^\s*(?:professional\s+summary|career\s+summary|executive\s+summary|profile\s+summary|summary|objective|career\s+objective|profile|about\s+me|about)\s*[:\-–]?\s*$/i
const OTHER_HEADING = /^\s*(?:experience|work\s+experience|employment|education|skills|technical\s+skills|projects|certifications?|achievements|languages|interests|references|declaration|personal\s+(?:details|information))\s*[:\-–]?\s*$/i

const MAX_NARRATIVE = 420
const cache = new Map()

export function scrub(text) {
  return String(text ?? '')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, '')
    .replace(/\b(?:linkedin|github)\.com\S*/gi, '')
    .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n).replace(/\s+\S*$/, '')}…`)
const oneLine = (s) => s.replace(/\s+/g, ' ').trim()

/** Fixes stray spacing and punctuation typed into profile fields ("B tech , College" -> "B tech, College"). */
export function tidyText(text) {
  const t = String(text ?? '')
    .replace(/\s+\.\s+/g, ', ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,;:])(?=\S)/g, '$1 ')
    .replace(/([,;:.])\1+/g, '$1')
    .replace(/[\s,;:.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return t ? t[0].toUpperCase() + t.slice(1) : ''
}

/** Candidates often type a whole skill list into one entry ("Java. Spring boot. My sql ."); split it into real skills. */
export function splitSkills(skills) {
  const out = []
  const seen = new Set()
  for (const entry of skills ?? []) {
    for (const part of String(entry ?? '').split(/\s*(?:[,;|•\n]|\.(?=\s|$))\s*/)) {
      const name = part.trim()
      const key = name.toLowerCase()
      if (!name || seen.has(key)) continue
      seen.add(key)
      out.push(name[0].toUpperCase() + name.slice(1))
    }
  }
  return out
}

/** The candidate's own "Summary / Objective" paragraph, when the CV has one. */
function narrativeFromResume(resumeText) {
  if (!resumeText) return ''
  const lines = String(resumeText).split(/\r?\n/)
  const at = lines.findIndex((l) => HEADING.test(l))
  if (at < 0) return ''
  const body = []
  for (const line of lines.slice(at + 1, at + 14)) {
    if (OTHER_HEADING.test(line)) break
    const clean = scrub(line.replace(/^[\s•\-–*▪●]+/, ''))
    if (clean) body.push(clean)
  }
  const text = oneLine(body.join(' '))
  return text.length >= 60 ? clip(text, MAX_NARRATIVE) : ''
}

function norm(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** A profile headline repeats the designation; only keep text that says more. */
function isDistinctProse(text, c) {
  const t = norm(text)
  return t.length >= 60 && t !== norm(c.designation)
}

const yrs = (n) => (n % 1 === 0 ? n : n.toFixed(1))

// One short fact per row, never repeating what the card already shows (current
// role, skills, education, location).
function pointsFromProfile(c, strong) {
  const points = []
  const exp = c.experienceYears
  const earlier = []
  const seen = new Set()
  for (const w of c.workHistory ?? []) {
    const label = [w.role, w.company].filter(Boolean).map(tidyText).join(' at ')
    const key = norm(label)
    const isCurrent = norm(w.role) === norm(c.designation) && norm(w.company) === norm(c.currentCompany)
    if (!label || seen.has(key) || isCurrent) continue
    seen.add(key)
    earlier.push(label)
  }
  if (earlier.length) points.push({ label: 'Background', text: `${exp > 0 ? `${yrs(exp)} yrs in the field. ` : ''}Also worked as ${earlier.slice(0, 2).join('; ')}.` })
  else if (exp > 0) points.push({ label: 'Background', text: `${yrs(exp)} years of hands-on experience.` })

  const project = (c.projects ?? []).find((p) => p.name && p.description) ?? (c.projects ?? []).find((p) => p.name)
  if (project) {
    const desc = project.description ? clip(tidyText(scrub(project.description)), 130) : ''
    const tech = (project.tech ?? []).slice(0, 4).join(', ')
    points.push({ label: 'Project', text: `${tidyText(project.name)}${desc ? ` — ${desc}` : ''}${tech ? ` (${tech})` : ''}` })
  }
  if (strong.length) points.push({ label: 'Fit', text: `Matches your search on ${strong.slice(0, 4).join(', ')}.` })
  return points
}

/**
 * @returns {{ kind: 'cv' | 'profile', text?: string, points: { label: string, text: string }[] } | null}
 * null when there is nothing honest to say.
 */
export function buildSummary(c, match) {
  const strong = match?.strong ?? []
  const key = `${c.id}|${strong.join(',')}`
  if (cache.has(key)) return cache.get(key)

  let text = narrativeFromResume(c.resumeText)
  if (!text && isDistinctProse(c.summary, c)) text = clip(oneLine(scrub(c.summary)), MAX_NARRATIVE)

  let result = null
  if (text) {
    result = { kind: 'cv', text, points: strong.length ? [{ label: 'Fit', text: `Matches your search on ${strong.slice(0, 4).join(', ')}.` }] : [] }
  } else {
    const points = pointsFromProfile(c, strong)
    if (points.length) result = { kind: 'profile', points }
  }
  if (cache.size > 2000) cache.clear()
  cache.set(key, result)
  return result
}
