import { apiClient, tokenStore } from '../lib/api'

// Login/exchange responses are { token, user, company }. The token is persisted here so
// the caller only has to flip session state.
async function persist(data) {
  await tokenStore.set(data.token)
  return data
}

export const login = (email, password) =>
  apiClient.post('/auth/login', { email: email.trim(), password }).then((r) => persist(r.data))

export const sendOtp = (phone) => apiClient.post('/auth/send-otp', { phone }).then((r) => r.data)
export const verifyOtp = (phone, otp) => apiClient.post('/auth/verify-otp', { phone, otp }).then((r) => r.data.phoneToken)

// 404 = number isn't registered (callers treat it as "continue to sign up").
export const phoneLogin = (phone, phoneToken) => apiClient.post('/auth/phone-login', { phone, phoneToken }).then((r) => persist(r.data))

export const signup = (body) => apiClient.post('/auth/signup', body).then((r) => persist(r.data))

export const forgotPassword = (email) => apiClient.post('/auth/forgot-password', { email: email.trim() }).then((r) => r.data)

// Permanently deletes the signed-in employer's account (see Backend utils/employerAccountDeletion.js).
export const deleteAccount = () => apiClient.delete('/auth/me', { data: { confirm: 'DELETE' } }).then((r) => r.data)

export const getMe = () => apiClient.get('/auth/me').then((r) => r.data)
export const updateMe = (body) => apiClient.put('/auth/me', body).then((r) => r.data)
