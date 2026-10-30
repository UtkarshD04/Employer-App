import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Banner, Btn, C, Input, Radio, Sheet, T } from '../wk'
import { getFeedbackOptions } from '../../services/recruiter'

const MAX_REASONS = 3
const FALLBACK_LIMITS = { remarksMin: 15, remarksOtherMin: 25, remarksMax: 1000 }
let optionsPromise = null
const loadOptions = () => (optionsPromise ??= getFeedbackOptions().catch((e) => { optionsPromise = null; throw e }))

const GROUPS = [
  ['skill', 'About skills and experience'],
  ['non_skill', 'Not about skills'],
  ['other', 'Something else'],
]

// Mirrors the server's check so the employer finds out before submitting. The server is still the authority.
function explanationError(text, reasons, limits) {
  const value = text.trim()
  const min = reasons.includes('other_job_related') ? limits.remarksOtherMin : limits.remarksMin
  if (!value) return reasons.includes('other_job_related') ? 'Explain the job-related reason you selected.' : 'Add a short, job-related explanation.'
  if (value.length < min) return `Write a clear, professional, job-related explanation (at least ${min} characters).`
  const words = new Set(value.toLowerCase().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)))
  const letters = value.replace(/[^\p{L}]/gu, '')
  if (words.size < 3 || new Set(letters.toLowerCase()).size < 4 || letters.length < value.replace(/\s/g, '').length * 0.6) {
    return 'That doesn’t look like a real explanation. Say what the role needed and what you saw.'
  }
  return ''
}

// Structured rejection feedback: how far the candidate got, the reason(s), and a clear job-related explanation.
// Used to answer a reviewer's request for clarification (`clarification`).
// `onSubmit({ stage, reasons, remarks })` may reject with an Error whose `.fieldErrors` maps field -> message.
export default function RejectionFeedbackSheet({ open, onClose, onSubmit, candidateName, initial, clarification, submitLabel = 'Reject candidate', title }) {
  const [options, setOptions] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [stage, setStage] = useState('')
  const [reasons, setReasons] = useState([])
  const [remarks, setRemarks] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setStage(initial?.stage ?? '')
    setReasons(initial?.reasons ?? [])
    setRemarks(initial?.remarks ?? '')
    setErrors({})
    setLoadError(false)
    loadOptions().then(setOptions).catch(() => setLoadError(true))
  }, [open, initial])

  const limits = options?.limits ?? FALLBACK_LIMITS
  const toggle = (code) => setReasons((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : cur.length >= MAX_REASONS ? cur : [...cur, code]))
  const skillSelected = reasons.some((code) => options?.reasons.find((r) => r.code === code)?.category === 'skill')

  const submit = async () => {
    if (busy) return
    const next = {}
    if (!stage) next.stage = 'Choose the stage the candidate reached.'
    if (reasons.length === 0) next.reasons = 'Select at least one reason.'
    const remarksProblem = explanationError(remarks, reasons, limits)
    if (remarksProblem) next.remarks = remarksProblem
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await onSubmit({ stage, reasons, remarks: remarks.trim() })
    } catch (e) {
      setErrors(e.fieldErrors ?? { form: e.message || 'Could not save the feedback. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  const group = (category) => (options?.reasons ?? []).filter((r) => r.category === category)

  return (
    <Sheet
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title ?? (clarification ? 'Update your feedback' : `Reject ${candidateName || 'this candidate'}?`)}
      subtitle="Tell us where the process ended and why. Mzobs reviews this before the candidate sees a summary."
      footer={<><Btn onPress={onClose} disabled={busy}>Cancel</Btn><Btn variant="primary" onPress={submit} loading={busy} disabled={!options}>{submitLabel}</Btn></>}
    >
      <View style={{ gap: 20 }}>
        {clarification ? <Banner tone="warn"><T s={13} c={C.warn}><T s={13} w="s" c={C.warn}>Mzobs asked: </T>{clarification}</T></Banner> : null}
        {loadError ? <T s={13} c={C.bad}>Couldn’t load the feedback options. Close this and try again.</T> : null}
        {!options && !loadError ? <T s={13} c={C.muted}>Loading…</T> : null}

        {options ? (
          <>
            <View style={{ gap: 4 }}>
              <T s={13} w="m" c={C.ink2}>How far did the candidate get?</T>
              {options.stages.map((s) => <Radio key={s.code} checked={stage === s.code} onPress={() => setStage(s.code)}>{s.label}</Radio>)}
              {errors.stage ? <T s={12} c={C.bad}>{errors.stage}</T> : null}
              {stage === 'application_review' ? <T s={12} c={C.muted}>No call or interview took place, so describe what you saw in the profile rather than interview performance.</T> : null}
            </View>

            <View style={{ gap: 4 }}>
              <T s={13} w="m" c={C.ink2}>Rejection reason (select up to {MAX_REASONS})</T>
              {GROUPS.map(([category, heading]) =>
                group(category).length === 0 ? null : (
                  <View key={category} style={{ marginTop: 8, gap: 6 }}>
                    <T s={11.5} w="b" c={C.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{heading}</T>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {group(category).map((r) => {
                        const on = reasons.includes(r.code)
                        const locked = !on && reasons.length >= MAX_REASONS
                        return (
                          <Pressable key={r.code} accessibilityState={{ selected: on, disabled: locked }} disabled={locked} onPress={() => toggle(r.code)} style={{ minHeight: 36, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? C.accentSoft : C.surface, paddingHorizontal: 12, opacity: locked ? 0.5 : 1 }}>
                            <T s={12.5} w="m" c={on ? C.accentText : C.ink2}>{r.label}</T>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                )
              )}
              {errors.reasons ? <T s={12} c={C.bad}>{errors.reasons}</T> : null}
            </View>

            <View style={{ gap: 4 }}>
              <T s={13} w="m" c={C.ink2}>Additional feedback{reasons.includes('other_job_related') ? <T s={13} c={C.muted}> (explain the reason you chose)</T> : null}</T>
              <Input
                value={remarks}
                onChangeText={setRemarks}
                maxLength={limits.remarksMax}
                multiline
                error={errors.remarks}
                placeholder={skillSelected ? 'Which skill or requirement was not met? e.g. needed 3+ years of React, profile shows one.' : 'Give a clear, professional, job-related explanation.'}
              />
              <T s={12} c={C.muted}>Stick to the role’s requirements. This is private: seen only by you and Mzobs reviewers, never as written by the candidate. {remarks.length}/{limits.remarksMax}</T>
              {errors.remarks ? <T s={12} c={C.bad}>{errors.remarks}</T> : null}
              {errors.form ? <T s={12} c={C.bad}>{errors.form}</T> : null}
            </View>
          </>
        ) : null}
      </View>
    </Sheet>
  )
}

// Turns an API 400 ({ errors: { field: message } }) into the Error shape the sheet understands.
export function feedbackSubmitError(e) {
  const fieldErrors = e.response?.data?.errors
  return Object.assign(new Error(e.response?.data?.message ?? 'Could not save the feedback.'), fieldErrors ? { fieldErrors } : {})
}
