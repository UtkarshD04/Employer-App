import { apiClient } from '../lib/api'

export const listOffers = () => apiClient.get('/offers').then((r) => r.data)
export const createOffer = (body) => apiClient.post('/offers', body).then((r) => r.data)
export const updateOfferStatus = (id, status) => apiClient.patch(`/offers/${id}/status`, { status }).then((r) => r.data)

export const OFFER_TONE = { draft: 'gray', pending: 'amber', accepted: 'green', rejected: 'red' }
