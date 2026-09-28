import { apiClient } from '../lib/api'

export const getDashboard = () => apiClient.get('/dashboard').then((r) => r.data)
