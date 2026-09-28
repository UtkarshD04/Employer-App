// Thin wrappers over the employer API used by the recruiter screens (unlock, outreach, stage, CV link…).
import { apiClient } from '../lib/api'
import { invalidatePool, fetchAll } from './talent'

/**
 * Opens one part of a candidate (`field`) → { candidate:{email,phone,resumeUrl,revealed,...}, wallet, alreadyUnlocked }.
 * The 1 CV credit is spent on the candidate's first reveal only. A
 * resume-database profile not yet in this company's pipeline is added to it,
 * optionally under one of its jobs (`jobId`).
 */
export const unlockCandidate = (c, { jobId, field } = {}) => {
  const { kind, candidateId, employeeId } = c._live ?? {}
  // `field` (email | phone | resume): the part being opened. The credit is spent
  // on a candidate's first reveal only; the other parts are then free.
  const body = { ...(field ? { field } : {}), ...(jobId ? { jobId } : {}) }
  const req = kind === 'resdex' ? apiClient.post(`/resume-search/${employeeId}/unlock`, body) : apiClient.post(`/candidates/${candidateId ?? c.id}/unlock`, body)
  return req.then((r) => {
    invalidatePool()
    return r.data
  })
}
/**
 * Emails or texts a candidate from the portal (channel: 'email' | 'sms'). The
 * backend needs the matching part viewed first (email / phone), sends email
 * from Mzobs with replies to the recruiter, and SMS as a fixed DLT template.
 */
export const sendOutreach = (c, { channel, subject, body }) => {
  const id = c._live?.candidateId ?? c.id
  return apiClient.post(`/candidates/${id}/outreach`, { channel, ...(channel === 'email' ? { subject, body } : {}) }).then((r) => r.data)
}

export const setCandidateStage = (id, stage, rejectionReason) =>
  apiClient.patch(`/candidates/${id}/stage`, { stage, rejectionReason }).then((r) => {
    invalidatePool()
    return r.data
  })
const resumeError = (code) => Object.assign(new Error(code), { code })

/**
 * A fresh signed CV link → { url, fileName? }. Rejects with `code` 'LOCKED'
 * (needs a CV-credit unlock) or 'NO_RESUME'. A pipeline candidate's CV is open
 * to an active plan without a credit; a database profile's only after unlock.
 */
export async function getResumeLink(c) {
  const { candidateId, employeeId } = c._live ?? {}
  try {
    if (candidateId) {
      try {
        return (await apiClient.get(`/candidates/${candidateId}/resume-url`)).data
      } catch (e) {
        if (e.response?.status !== 403) throw e
      }
      const r = await apiClient.get(`/candidates/${candidateId}`)
      if (r.data.resumeUrl) return { url: r.data.resumeUrl }
      // Paid for but the CV part not opened yet is still locked (see lib/reveal.js).
      const cvOpen = r.data.unlocked && (r.data.revealed ?? ['resume']).includes('resume')
      throw resumeError(cvOpen ? 'NO_RESUME' : 'LOCKED')
    }
    return (await apiClient.get(`/resume-search/${employeeId}/resume-url`)).data
  } catch (e) {
    if (e.code === 'LOCKED' || e.code === 'NO_RESUME') throw e
    if (e.response?.status === 403) throw resumeError('LOCKED')
    if (e.response?.status === 404) throw resumeError('NO_RESUME')
    throw e
  }
}
/** Every CV this company has unlocked, newest first: { id, candidate:{id,name,headline,appliedFor}|null, job:{id,title}|null, creditsUsed, unlockedAt }. */
export const listUnlocks = () => fetchAll('/unlocks', 10)
export const getCredits = () => apiClient.get('/credits').then((r) => r.data)
export const listInterviews = () => apiClient.get('/interviews').then((r) => r.data)
export const scheduleInterview = (body) => apiClient.post('/interviews', body).then((r) => r.data)
