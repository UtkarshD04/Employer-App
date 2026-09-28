import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { API_BASE } from './config'

const TOKEN_KEY = 'mzobs-employer-token'

export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
}

export const apiClient = axios.create({ baseURL: API_BASE, timeout: 15000 })

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// AuthContext registers itself so a 401 anywhere (expired/revoked token) clears the
// session and drops back to Login.
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only a request that carried a session means "session expired" — otherwise a failed
    // login attempt (401 too) or logout's own cleanup calls would loop.
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      await tokenStore.clear()
      onUnauthorized?.()
    }
    return Promise.reject(error)
  }
)

export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message ?? (err?.response ? fallback : 'Network error. Check your connection and try again.')

// Pagination rides on x-total-count headers (see Backend paginate.js): pulls every page.
export async function fetchAll(url, { params = {}, limit = 100, maxPages = 20 } = {}) {
  const rows = []
  for (let page = 1; page <= maxPages; page++) {
    const r = await apiClient.get(url, { params: { ...params, page, limit } })
    rows.push(...r.data)
    if (rows.length >= Number(r.headers['x-total-count'] ?? rows.length) || r.data.length < limit) break
  }
  return rows
}

// One page + whether more exist, for infinite lists.
export async function fetchPage(url, { params = {}, page = 1, limit = 25 } = {}) {
  const r = await apiClient.get(url, { params: { ...params, page, limit } })
  const total = Number(r.headers['x-total-count'] ?? r.data.length)
  return { rows: r.data, page, total, hasMore: page * limit < total }
}
