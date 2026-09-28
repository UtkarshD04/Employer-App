const inr = new Intl.NumberFormat('en-IN')

export const formatDate = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? String(d) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

export const formatRelative = (d) => {
  if (!d) return ''
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
  if (mins < 60 * 24 * 7) return `${Math.round(mins / 1440)}d ago`
  return formatDate(d)
}

export const formatRupees = (n) => (n == null || n === '' ? '—' : `₹${inr.format(Math.round(Number(n)))}`)

// Job salaries are annual rupees; the UI talks in LPA.
export const rupeesToLpa = (r) => (r == null ? '' : Math.round((r / 100000) * 100) / 100)
export const lpaToRupees = (lpa) => Math.round(Number(lpa) * 100000)
export const formatSalaryRange = (min, max) => (min == null && max == null ? '—' : `₹${rupeesToLpa(min)}–${rupeesToLpa(max)} LPA`)

export const toIsoDate = (d) => {
  const date = d instanceof Date ? d : new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
