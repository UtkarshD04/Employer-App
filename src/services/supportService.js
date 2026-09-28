import { apiClient } from '../lib/api'

export const TICKET_CATEGORIES = ['General', 'Billing', 'Candidate Quality', 'Technical Issue', 'Payment', 'Resume Verification']
export const submitTicket = (body) => apiClient.post('/support/tickets', body).then((r) => r.data)
