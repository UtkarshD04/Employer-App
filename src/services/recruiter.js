// Recruiter workspace API (applicants pipeline, overview, scorecards, team, managed shortlisting, insights, messages).
// Same endpoints as the website's services/recruiterService.js.
import { useEffect, useState } from 'react'
import { apiClient } from '../lib/api'

const data = (r) => r.data

export const PIPELINE = [
  { key: 'new', label: 'New' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
]
export const STAGE_LABEL = Object.fromEntries(PIPELINE.map((s) => [s.key, s.label]))

export const apiMessage = (e, fallback = 'Something went wrong. Please try again.') => e?.response?.data?.message ?? (e?.response ? fallback : 'No response from the server. Check your connection and try again.')

// ---- overview
export const getOverview = () => apiClient.get('/overview').then(data)

// ---- applicants
export const getApplicantsSummary = () => apiClient.get('/applicants/summary').then(data)
export const listApplicants = (params) => apiClient.get('/applicants', { params }).then(data)
export const getApplicant = (id) => apiClient.get(`/applicants/${id}`).then(data)
export const moveApplicant = (id, stage) => apiClient.post(`/applicants/${id}/stage`, { stage }).then(data)
export const bulkUpdateApplicants = (body) => apiClient.post('/applicants/bulk', body).then(data)
export const updateApplicant = (id, body) => apiClient.patch(`/applicants/${id}`, body).then(data)
export const addApplicantNote = (id, text) => apiClient.post(`/applicants/${id}/notes`, { text }).then(data)
export const rejectApplicant = (id, body) => apiClient.post(`/applicants/${id}/reject`, body).then(data)
export const getRejectionOptions = () => apiClient.get('/applicants/rejection-options').then(data)
export const compareApplicants = (ids) => apiClient.post('/applicants/compare', { ids }).then(data)
/** The CSV text of the applicants export — the screen hands it to the system share sheet. */
export const exportApplicants = (jobId) => apiClient.get('/applicants/export', { params: { jobId }, responseType: 'text', transformResponse: (x) => x }).then(data)

// ---- interviews
export const submitScorecard = (id, body) => apiClient.post(`/interviews/${id}/scorecard`, body).then(data)
export const updateInterviewPanel = (id, body) => apiClient.patch(`/interviews/${id}/panel`, body).then(data)

// ---- team & audit
export const getMe = () => apiClient.get('/team/me').then(data)
export const getRoleMatrix = () => apiClient.get('/team/roles').then(data)
export const listTeam = () => apiClient.get('/team').then(data)
export const inviteMember = (body) => apiClient.post('/team/invite', body).then(data)
export const setMemberRole = (id, role) => apiClient.patch(`/team/${id}/role`, { role }).then(data)
export const removeMember = (id) => apiClient.delete(`/team/${id}`).then(data)
export const listAudit = (params) => apiClient.get('/team/audit', { params }).then(data)

// ---- offers
export const listOffers = () => apiClient.get('/offers').then(data)
export const createOffer = (body) => apiClient.post('/offers', body).then(data)
export const setOfferStatus = (id, status) => apiClient.patch(`/offers/${id}/status`, { status }).then(data)

// ---- managed shortlisting
export const listManagedRequests = (jobId) => apiClient.get('/managed-shortlist', { params: jobId ? { jobId } : undefined }).then(data)
export const createManagedRequest = (body) => apiClient.post('/managed-shortlist', body).then(data)
export const closeManagedRequest = (id) => apiClient.post(`/managed-shortlist/${id}/close`).then(data)
export const MANAGED_STEPS = [
  { key: 'requested', label: 'Requested' },
  { key: 'in_review', label: 'In review' },
  { key: 'shortlisting', label: 'Shortlisting' },
  { key: 'shortlist_shared', label: 'Shortlist shared' },
  { key: 'closed', label: 'Closed' },
]

// ---- insights & communications
export const getJobInsights = (jobId) => apiClient.get(`/jobs/${jobId}/insights`).then(data)
export const listTemplates = () => apiClient.get('/communications/templates').then(data)
export const saveTemplate = (key, body) => apiClient.put(`/communications/templates/${key}`, body).then(data)
export const resetTemplate = (key) => apiClient.delete(`/communications/templates/${key}`).then(data)
export const previewMessage = (body) => apiClient.post('/communications/preview', body).then(data)
export const sendMessage = (body) => apiClient.post('/communications/send', body).then(data)
export const listCommLog = (candidateId) => apiClient.get('/communications/log', { params: candidateId ? { candidateId } : undefined }).then(data)

// ---- rejection feedback follow-ups
export const getFeedbackOptions = () => apiClient.get('/rejection-feedback/options').then(data)
export const getCandidateFeedback = (candidateId) =>
  apiClient
    .get(`/rejection-feedback/by-candidate/${candidateId}`)
    .then(data)
    .catch((e) => (e.response?.status === 404 ? null : Promise.reject(e)))
export const listFeedbackFollowUps = () => apiClient.get('/rejection-feedback', { params: { followUp: 1 } }).then(data)
export const resubmitFeedback = (id, feedback) => apiClient.put(`/rejection-feedback/${id}`, feedback).then(data)

// ---- permissions
let mePromise = null
let meCache = null
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn(meCache))

export function loadMe({ force = false } = {}) {
  if (meCache && !force) return Promise.resolve(meCache)
  mePromise ??= getMe()
    .then((m) => {
      meCache = m
      emit()
      return m
    })
    .finally(() => {
      mePromise = null
    })
  return mePromise
}
/** Forget the cached role — called on sign-out so the next account never sees the last one's permissions. */
export function clearMe() {
  meCache = null
  emit()
}

/** The signed-in user's role and permissions from the server. `can()` is false until they load, so nothing flashes enabled. */
export function usePermissions() {
  const [me, setMe] = useState(meCache)
  useEffect(() => {
    listeners.add(setMe)
    loadMe().catch(() => {})
    return () => listeners.delete(setMe)
  }, [])
  return { me, role: me?.role ?? null, loaded: !!me, can: (p) => !!me?.permissions?.includes(p) }
}
