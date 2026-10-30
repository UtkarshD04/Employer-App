// How the lead / enquiry forms hold a phone number (the same shape the API validates):
//  - an Indian mobile as its bare 10 digits starting 6-9;
//  - any other country as "+<country code><number>".

export const COUNTRIES = [
  { code: '91', label: 'IN +91' },
  { code: '1', label: 'US/CA +1' },
  { code: '44', label: 'UK +44' },
  { code: '971', label: 'UAE +971' },
  { code: '966', label: 'SA +966' },
  { code: '974', label: 'QA +974' },
  { code: '965', label: 'KW +965' },
  { code: '968', label: 'OM +968' },
  { code: '973', label: 'BH +973' },
  { code: '65', label: 'SG +65' },
  { code: '61', label: 'AU +61' },
  { code: '64', label: 'NZ +64' },
  { code: '49', label: 'DE +49' },
  { code: '33', label: 'FR +33' },
  { code: '977', label: 'NP +977' },
  { code: '880', label: 'BD +880' },
  { code: '94', label: 'LK +94' },
]

// Longest code first, so "+971" is not read as "+9".
const BY_LENGTH = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length)

/** A stored phone → { cc, digits } (digits are the national number, without the code). */
export function splitPhone(value) {
  const v = String(value ?? '').replace(/[\s-]/g, '')
  if (!v.startsWith('+')) return { cc: '91', digits: v.replace(/\D/g, '') }
  const hit = BY_LENGTH.find((c) => v.slice(1).startsWith(c.code))
  return hit ? { cc: hit.code, digits: v.slice(1 + hit.code.length).replace(/\D/g, '') } : { cc: '91', digits: v.replace(/\D/g, '') }
}

export const maxDigits = (cc) => (cc === '91' ? 10 : 12)

export const joinPhone = (cc, digits) => (cc === '91' ? digits : digits ? `+${cc}${digits}` : '')

export const isIndianMobile = (v) => /^[6-9]\d{9}$/.test(String(v ?? '').trim())

/** An Indian mobile, or "+<code><number>" of 8-15 digits for another country. */
export const isValidPhone = (v) => isIndianMobile(v) || /^\+(?!91)[1-9]\d{7,14}$/.test(String(v ?? '').replace(/[\s-]/g, ''))

export const MOBILE_ERROR = 'Enter a valid mobile number'
