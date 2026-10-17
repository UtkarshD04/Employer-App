import { useState } from 'react'
import { View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import { isValidGstin, normalizeGstin } from '../lib/gstin'
import { verifyGst } from '../services/companyService'
import { useAuth } from '../context/AuthContext'
import { Badge, Button, Card, KeyValue, SectionTitle, Text, TextField } from './ui'

// Mandatory GST verification (the GST gate screen and Company profile) — the
// same POST /company/verify-gst record the recruiter website shows, so a
// result from either client appears in both.
const STATUS = {
  NOT_SUBMITTED: ['Not verified', 'gray'],
  PENDING: ['Verifying', 'amber'],
  VERIFIED: ['Verified', 'green'],
  FAILED: ['Not verified', 'red'],
  UNDER_REVIEW: ['Under review', 'amber'],
}

const FAILURE_TEXT = {
  NAME_MISMATCH: 'The legal name doesn’t match the GST record. Enter it exactly as on your GST certificate.',
  INACTIVE_REGISTRATION: 'This GST registration is not active (cancelled or suspended).',
  GSTIN_NOT_FOUND: 'No GST registration was found for this GSTIN.',
  PROVIDER_ERROR: 'We couldn’t reach the GST service. Please try again later.',
  PROVIDER_TIMEOUT: 'The GST service took too long to respond. Please try again.',
  PROVIDER_RATE_LIMITED: 'The GST service is busy. Please try again in a few minutes.',
  REJECTED_BY_REVIEW: 'The Mzobs team couldn’t confirm this GSTIN for your company.',
}

const titleCase = (s) => (s ? s[0] + s.slice(1).toLowerCase() : '')

function Details({ gst }) {
  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      <KeyValue label="GSTIN" value={gst.gstin} />
      <KeyValue label="Legal name" value={gst.legalName} />
      <KeyValue label="Trade name" value={gst.tradeName} />
      <KeyValue label="Status" value={titleCase(gst.registrationStatus)} />
      <KeyValue label="Address" value={gst.registeredAddress} />
    </View>
  )
}

export default function GstVerificationCard({ company }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const gst = company?.gstVerification ?? { status: 'NOT_SUBMITTED' }
  const [form, setForm] = useState(null)
  const [answer, setAnswer] = useState(null) // last { code, message } from the server

  const values = form ?? { gstin: gst.gstin || '', legalName: gst.submittedLegalName || company?.name || '', companyName: company?.name || '' }
  const formatOk = isValidGstin(values.gstin)

  const verify = useMutation({
    mutationFn: () => verifyGst({ gstin: normalizeGstin(values.gstin), legalName: values.legalName.trim(), companyName: values.companyName.trim() }),
    onSuccess: (r) => {
      setAnswer({ code: r.code, message: r.message })
      if (r.gstVerification) qc.setQueryData(queryKeys.company, (c) => (c ? { ...c, gstVerification: r.gstVerification } : c))
      qc.invalidateQueries({ queryKey: queryKeys.company }) // the company name may have changed too
    },
    onError: () => setAnswer({ code: 'NETWORK', message: 'Network error. Check your connection and try again.' }),
  })

  const [label, tone] = STATUS[gst.status] ?? STATUS.NOT_SUBMITTED
  const failure = answer && answer.code !== 'VERIFIED' ? answer.message : gst.status === 'FAILED' ? FAILURE_TEXT[gst.reason] : null
  const canSubmit = ['NOT_SUBMITTED', 'FAILED'].includes(gst.status) || (gst.status === 'PENDING' && verify.isPending)

  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <SectionTitle>GST verification</SectionTitle>
      <Card>
        <View style={{ gap: 10 }}>
          <Badge label={label} tone={tone} />
          {gst.status === 'VERIFIED' ? (
            <>
              <Text variant="caption">Your GSTIN has been verified with the GST registry.</Text>
              <Details gst={gst} />
            </>
          ) : gst.status === 'UNDER_REVIEW' ? (
            <>
              <Text variant="caption">We found an active GST registration. The Mzobs team will confirm it belongs to your company — no action needed.</Text>
              <Details gst={gst} />
            </>
          ) : gst.status === 'PENDING' && !verify.isPending ? (
            <Text variant="caption">A verification for {gst.gstin} is in progress. Pull down to refresh.</Text>
          ) : null}

          {failure ? <Text variant="caption" color="red">{failure}</Text> : null}

          {canSubmit && user?.role !== 'Admin' ? <Text variant="caption">Only your company’s Admin can submit the GSTIN for verification.</Text> : null}

          {canSubmit && user?.role === 'Admin' ? (
            <>
              <TextField
                label="GSTIN"
                value={values.gstin}
                onChangeText={(v) => setForm({ ...values, gstin: normalizeGstin(v).slice(0, 15) })}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={15}
                placeholder="15-character GSTIN"
                error={values.gstin.length === 15 && !formatOk ? 'That isn’t a valid GSTIN — check the characters.' : null}
              />
              <TextField
                label="Company name"
                value={values.companyName}
                onChangeText={(v) => setForm({ ...values, companyName: v })}
                placeholder="Your GST legal or trade name"
                maxLength={200}
              />
              <Text variant="caption">Use your GST legal or trade name for instant activation. A different brand name is reviewed by the Mzobs team.</Text>
              <TextField label="Legal name of business" value={values.legalName} onChangeText={(v) => setForm({ ...values, legalName: v })} placeholder="As on your GST certificate" maxLength={200} />
              <Button
                title={gst.status === 'FAILED' ? 'Try again' : 'Verify GSTIN'}
                loading={verify.isPending}
                disabled={!formatOk || values.legalName.trim().length < 2 || values.companyName.trim().length < 2}
                onPress={() => {
                  setAnswer(null)
                  verify.mutate()
                }}
              />
            </>
          ) : null}
        </View>
      </Card>
    </View>
  )
}
