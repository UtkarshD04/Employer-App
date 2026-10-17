// Client-side GSTIN format check — mirrors Backend/src/utils/gstin.js (and the recruiter website) so a
// typo is caught before a (paid, rate-limited) verification request. It is
// only a convenience: the server re-validates and alone decides verification.
const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

// Keep in step with the backend's GST_VERIFICATION_REQUIRED.
export const GST_REQUIRED = false

export const normalizeGstin = (value) => (typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : '')

export function isValidGstin(value) {
  const gstin = normalizeGstin(value)
  if (!GSTIN_RE.test(gstin)) return false
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const product = CHARSET.indexOf(gstin[i]) * (i % 2 ? 2 : 1)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return CHARSET[(36 - (sum % 36)) % 36] === gstin[14]
}
