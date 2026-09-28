import { apiClient } from '../lib/api'

export const MODES = ['Video Call', 'Phone', 'On-site']
export const ROUNDS = ['Screening', 'Technical', 'Managerial', 'HR', 'Final']

export const listInterviews = () => apiClient.get('/interviews').then((r) => r.data)
export const scheduleInterview = (body) => apiClient.post('/interviews', body).then((r) => r.data)
export const rescheduleInterview = (id, body) => apiClient.patch(`/interviews/${id}/reschedule`, body).then((r) => r.data)
export const cancelInterview = (id) => apiClient.patch(`/interviews/${id}/cancel`).then((r) => r.data)
export const submitFeedback = (id, body) => apiClient.post(`/interviews/${id}/feedback`, body).then((r) => r.data)

export const INTERVIEW_TONE = { Confirmed: 'green', 'Awaiting confirmation': 'amber', Rescheduled: 'violet', Completed: 'navy', Cancelled: 'gray' }
