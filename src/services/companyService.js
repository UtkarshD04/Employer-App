import { apiClient } from '../lib/api'

export const getCompany = () => apiClient.get('/company').then((r) => r.data)
export const updateCompany = (body) => apiClient.put('/company', body).then((r) => r.data)

// Same server-side verification the recruiter website uses. Resolves with the
// server's { code, message, gstVerification } for every answered request —
// including FAILED/UNDER_REVIEW and refusals (409/429/503) — and rejects only
// when the server couldn't be reached.
// `companyName` is only applied by the server while the company has never been verified.
export async function verifyGst({ gstin, legalName, companyName }) {
  try {
    return (await apiClient.post('/company/verify-gst', { gstin, legalName, companyName })).data
  } catch (err) {
    const data = err.response?.data
    if (!data) throw err
    return { ...data, code: data.code ?? (err.response.status === 429 ? 'RATE_LIMITED' : 'PROVIDER_ERROR') }
  }
}
