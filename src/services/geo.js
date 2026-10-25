// Location lookups for the recruiter filters, all through the backend's /geo proxy
// (Backend/src/routes/geoRoutes.js) so no geocoder credentials reach the app:
//   GET /geo/states, /geo/places?q=, /geo/reverse?lat&lng, /geo/pincode/:pin
//   GET /jobs/location-facets  — the state/city/locality values this company's jobs already carry
import { apiClient } from '../lib/api'

export const RADIUS_OPTIONS = [
  { value: 100, label: 'Within 100 m' },
  { value: 250, label: 'Within 250 m' },
  { value: 500, label: 'Within 500 m' },
  { value: 1000, label: 'Within 1 km' },
  { value: 2000, label: 'Within 2 km' },
  { value: 5000, label: 'Within 5 km' },
  { value: 10000, label: 'Within 10 km' },
  { value: 25000, label: 'Within 25 km' },
]
export const radiusLabel = (m) => RADIUS_OPTIONS.find((o) => o.value === m)?.label ?? `Within ${m} m`
// Mirrors Backend/src/utils/jobLocation.js — below this the server only matches map-pinned jobs.
export const PRECISE_RADIUS_BELOW_M = 1000

export const isPin = (v) => /^[1-9]\d{5}$/.test(v)

export const getStates = () => apiClient.get('/geo/states').then((r) => r.data.states)
export const getLocationFacets = () => apiClient.get('/jobs/location-facets').then((r) => r.data)
// This company's active openings (status 'sourcing') per { state, city, pincode } — only jobs that carry a PIN.
export const getHiringPincodes = () => apiClient.get('/jobs/hiring-pincodes').then((r) => r.data)
export const searchPlaces = (q, { state, city, signal } = {}) =>
  apiClient.get('/geo/places', { params: { q, state: state || undefined, city: city || undefined }, signal }).then((r) => r.data)
export const reverseGeocode = (lat, lng) => apiClient.get('/geo/reverse', { params: { lat, lng } }).then((r) => r.data)
export const lookupPincode = (pin) => apiClient.get(`/geo/pincode/${pin}`).then((r) => r.data)

/** Human message for a failed location request. */
export function geoError(e) {
  if (e?.code === 'ERR_CANCELED') return ''
  return e?.response?.data?.message ?? 'Location service is unavailable. You can still pick a point on the map.'
}

/** Distance label for a job: "Within 100 m", "250 m away", "1.2 km away". */
export function distanceLabel(meters, radius) {
  if (meters == null) return ''
  if (radius === 100 && meters <= 100) return 'Within 100 m'
  if (meters < 1000) return `${meters} m away`
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km away`
}

// PIN → { district, state, areas } from the India Post directory (GET /geo/pincode/:pin).
// Cached per PIN, and paced so a long PIN list can't exhaust the backend's 40-requests-a-minute geo limit.
const pinCache = new Map() // pin → { info, error } once settled
const pinPending = new Map()
const BUCKET = { tokens: 8, max: 8, last: Date.now() }
const REFILL_MS = 1700

const takeToken = async () => {
  for (;;) {
    const now = Date.now()
    BUCKET.tokens = Math.min(BUCKET.max, BUCKET.tokens + (now - BUCKET.last) / REFILL_MS)
    BUCKET.last = now
    if (BUCKET.tokens >= 1) { BUCKET.tokens -= 1; return }
    await new Promise((r) => setTimeout(r, REFILL_MS))
  }
}

/** Already-fetched info for a PIN (or null) — never triggers a request. */
export const peekPinInfo = (pin) => pinCache.get(pin)?.info ?? null

/** @returns {Promise<{district:string,state:string,areas:string[]}|null>} null when the directory has no entry for the PIN. */
export function getPinInfo(pin) {
  if (!isPin(pin)) return Promise.resolve(null)
  const hit = pinCache.get(pin)
  if (hit) return hit.error ? Promise.reject(hit.error) : Promise.resolve(hit.info)
  if (pinPending.has(pin)) return pinPending.get(pin)
  const p = takeToken()
    .then(() => lookupPincode(pin))
    .then((r) => { const info = { district: r.district ?? '', state: r.state ?? '', areas: r.areas ?? [] }; pinCache.set(pin, { info }); return info })
    .catch((e) => {
      if (e?.response?.status === 404) { pinCache.set(pin, { info: null }); return null }
      throw e // provider down / rate-limited: not cached, so a later look retries
    })
    .finally(() => pinPending.delete(pin))
  pinPending.set(pin, p)
  return p
}

/** "Gomti Nagar, Vikas Nagar +2" — the postal areas a PIN covers, never one area standing in for all. */
export function areaSummary(areas, max = 2) {
  if (!areas?.length) return ''
  return areas.slice(0, max).join(', ') + (areas.length > max ? ` +${areas.length - max}` : '')
}
