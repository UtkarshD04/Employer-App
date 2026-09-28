import { apiClient, fetchPage } from '../lib/api'

export const STAGES = [
  { id: 'shared', label: 'New', tone: 'navy' },
  { id: 'shortlisted', label: 'Shortlisted', tone: 'violet' },
  { id: 'interviewing', label: 'Interview', tone: 'amber' },
  { id: 'offered', label: 'Offered', tone: 'gold' },
  { id: 'hired', label: 'Hired', tone: 'green' },
  { id: 'rejected', label: 'Rejected', tone: 'red' },
]
export const stageMeta = (id) => STAGES.find((s) => s.id === id) ?? { id, label: id ?? '—', tone: 'gray' }

// The contact part being opened — the 1 CV credit is spent on the first reveal only.
export const REVEAL_FIELDS = ['email', 'phone', 'resume']

export const listCandidatesPage = ({ filters, page }) =>
  fetchPage('/candidates', { params: { ...filters }, page, limit: 25 })

export const getCandidate = (id) => apiClient.get(`/candidates/${id}`).then((r) => r.data)

export const setCandidateStage = (id, stage, rejectionReason) =>
  apiClient.patch(`/candidates/${id}/stage`, { stage, ...(rejectionReason ? { rejectionReason } : {}) }).then((r) => r.data)

/** -> { candidate, wallet, alreadyUnlocked } */
export const unlockCandidate = (id, field) => apiClient.post(`/candidates/${id}/unlock`, { field }).then((r) => r.data)

/** Signed CV link -> { url, fileName? }. 403 = locked, 404 = no resume. */
export const getCandidateResumeUrl = (id) => apiClient.get(`/candidates/${id}/resume-url`).then((r) => r.data)

export const sendOutreach = (id, { channel, subject, body }) =>
  apiClient.post(`/candidates/${id}/outreach`, { channel, ...(channel === 'email' ? { subject, body } : {}) }).then((r) => r.data)
