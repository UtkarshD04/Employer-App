import { apiClient, tokenStore } from '../lib/api'

// Login/exchange responses are { token, user, company }. The token is persisted here so
// the caller only has to flip session state.
async function persist(data) {
  await tokenStore.set(data.token)
  return data
}

export const login = (email, password) =>
  apiClient.post('/auth/login', { email: email.trim(), password }).then((r) => persist(r.data))

export const forgotPassword = (email) => apiClient.post('/auth/forgot-password', { email: email.trim() }).then((r) => r.data)

export const getMe = () => apiClient.get('/auth/me').then((r) => r.data)
export const updateMe = (body) => apiClient.put('/auth/me', body).then((r) => r.data)
