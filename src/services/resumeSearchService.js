import { apiClient, fetchPage } from '../lib/api'

export const NOTICE_PERIODS = ['Immediate', '15 days', '30 days', '60 days', '90 days']

// Filters are comma lists server-side (see Backend utils/resumeSearchFilters.js).
export const searchPage = ({ filters, page }) => {
  const params = {}
  for (const [k, v] of Object.entries(filters)) if (v !== '' && v != null && !(Array.isArray(v) && !v.length)) params[k] = Array.isArray(v) ? v.join(',') : v
  return fetchPage('/resume-search', { params, page, limit: 25 })
}

export const getProfile = (employeeId) => apiClient.get(`/resume-search/${employeeId}`).then((r) => r.data)

// A database profile not yet in the pipeline is added to `jobId` on first unlock.
export const unlockProfile = (employeeId, field, jobId) =>
  apiClient.post(`/resume-search/${employeeId}/unlock`, { field, ...(jobId ? { jobId } : {}) }).then((r) => r.data)

export const getProfileResumeUrl = (employeeId) => apiClient.get(`/resume-search/${employeeId}/resume-url`).then((r) => r.data)
