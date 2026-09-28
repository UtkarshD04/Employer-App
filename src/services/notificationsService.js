import { apiClient } from '../lib/api'

export const listNotifications = () => apiClient.get('/notifications').then((r) => r.data)
export const markRead = (id) => apiClient.patch(`/notifications/${id}/read`)
export const markAllRead = () => apiClient.patch('/notifications/read-all')

export const registerExpoToken = (token) => apiClient.post('/push/expo-token', { token })
