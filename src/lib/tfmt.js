export function ago(days) {
  if (days == null) return '—'
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.round(days / 30)} mo ago`
  return `${Math.round(days / 365)} yr ago`
}
export function agoDate(iso) {
  return ago(Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}
export function lpa(n) {
  return n == null ? '—' : `₹${Number(n) % 1 === 0 ? n : n.toFixed(1)} LPA`
}
export function notice(days) {
  if (days == null) return '—'
  return days === 0 ? 'Immediate' : `${days} days`
}
export function years(n) {
  if (n == null) return '—'
  return `${n % 1 === 0 ? n : n.toFixed(1)} yrs`
}
export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A `tel:` link for a stored phone number ("9876543210", "+91 98765 43210", "09876543210" → +91XXXXXXXXXX).
export function telHref(phone) {
  const raw = String(phone ?? '').replace(/[^\d+]/g, '')
  const bare = raw.replace(/^\+/, '')
  if (/^[6-9]\d{9}$/.test(bare)) return `tel:+91${bare}`
  if (/^91[6-9]\d{9}$/.test(bare)) return `tel:+${bare}`
  if (/^0[6-9]\d{9}$/.test(bare)) return `tel:+91${bare.slice(1)}`
  return `tel:${raw}`
}
export const agoDays = ago
