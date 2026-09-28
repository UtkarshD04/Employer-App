import { apiClient } from '../lib/api'

export const getCompany = () => apiClient.get('/company').then((r) => r.data)
export const updateCompany = (body) => apiClient.put('/company', body).then((r) => r.data)
