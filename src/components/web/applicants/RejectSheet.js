import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Eye, Lock } from 'lucide-react-native'
import { Btn, C, CheckBox, Field, Input, Sheet, T, card } from '../../wk'
import { Overline } from '../rc'
import { apiMessage, getRejectionOptions, rejectApplicant } from '../../../services/recruiter'

const MAX_REASONS = 3

// Rejecting separates two things on purpose: the internal reason (private to your team and MZOBS reviewers) and, only if
// you switch it on, a choice of respectful reasons the candidate may see — after an MZOBS reviewer has approved the wording.
export default function RejectSheet({ candidate, candidates, onClose, onDone, toast }) {
  // One candidate from their sheet, or several from the bulk bar — all get the same recorded reasons.
  const list = candidates?.length ? candidates : candidate ? [candidate] : []
  const many = list.length > 1
  const [options, setOptions] = useState([])
  const [internal, setInternal] = useState('')
  const [share, setShare] = useState(false)
  const [reasons, setReasons] = useState([])
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!list.length) return
    setInternal('')
    setShare(false)
    setReasons([])
    setErrors({})
    getRejectionOptions().then(setOptions).catch(() => setOptions([]))
  }, [candidate, candidates]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (code) => {
    setErrors((x) => ({ ...x, candidateReasons: undefined }))
    setReasons((r) => (r.includes(code) ? r.filter((x) => x !== code) : r.length >= MAX_REASONS ? r : [...r, code]))
  }

  const submit = async () => {
    const e = {}
    if (internal.trim().length < 10) e.internalReason = 'Record a brief internal reason (at least 10 characters).'
    if (share && reasons.length === 0) e.candidateReasons = 'Select at least one reason the candidate may see.'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    const body = { internalReason: internal.trim(), shareFeedback: share, candidateReasons: share ? reasons : [] }
    if (many) {
      // Each rejection is its own server record, so run them one at a time and report what happened.
      let failed = 0
      for (const c of list) {
        try { await rejectApplicant(c.id, body) } catch { failed += 1 }
      }
      setBusy(false)
      toast(failed ? `${list.length - failed} rejected, ${failed} could not be rejected.` : `${list.length} candidates rejected.`, failed ? { tone: 'warn' } : undefined)
      onDone()
      return
    }
    try {
      const res = await rejectApplicant(candidate.id, body)
      toast(res.message ?? (res.feedbackShared ? `${candidate.name} rejected. Feedback sent to MZOBS for review.` : `${candidate.name} rejected.`), res.message ? { tone: 'warn' } : undefined)
      onDone()
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { form: apiMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={list.length > 0}
      onClose={busy ? () => {} : onClose}
      title={many ? `Reject ${list.length} candidates` : 'Reject candidate'}
      subtitle={many ? list.map((c) => c.name).join(', ') : candidate?.name}
      footer={<><Btn onPress={onClose} disabled={busy}>Cancel</Btn><Btn variant="primary" onPress={submit} loading={busy}>{many ? `Reject ${list.length}` : 'Reject candidate'}</Btn></>}
    >
      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Lock size={12} color={C.ink2} /><Overline>Internal reason · private</Overline></View>
          <Field label="Why are you rejecting this candidate?" error={errors.internalReason} hint="Only your team and MZOBS reviewers can read this. The candidate never sees it.">
            <Input value={internal} onChangeText={(v) => { setInternal(v); setErrors((x) => ({ ...x, internalReason: undefined })) }} multiline maxLength={1000} error={errors.internalReason} />
          </Field>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Eye size={12} color={C.ink2} /><Overline>Candidate-visible feedback</Overline></View>
          <View style={[card, { padding: 10, borderRadius: 12 }]}>
            <CheckBox checked={share} onChange={setShare}>Share feedback with the candidate</CheckBox>
            <T s={12.5} c={C.muted} style={{ marginLeft: 28 }}>Off by default. When on, MZOBS reviews it and shows the candidate a respectful “Application Insights” update. Nothing is shown until a reviewer approves it.</T>
          </View>
          {share ? (
            <View style={{ gap: 6 }}>
              <T s={12.5} w="s" c={C.ink2}>Reasons the candidate may see (up to {MAX_REASONS})</T>
              {options.map((o) => {
                const on = reasons.includes(o.code)
                return (
                  <View key={o.code} style={{ borderRadius: 10, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? '#f1f9f7' : '#fff', paddingHorizontal: 10, opacity: !on && reasons.length >= MAX_REASONS ? 0.5 : 1 }}>
                    <CheckBox checked={on} onChange={() => toggle(o.code)}>{o.label}</CheckBox>
                  </View>
                )
              })}
              {errors.candidateReasons ? <T s={12} c={C.bad}>{errors.candidateReasons}</T> : null}
            </View>
          ) : null}
        </View>
        {errors.form || errors.shareFeedback ? <T s={13} w="m" c={C.bad}>{errors.form ?? errors.shareFeedback}</T> : null}
      </View>
    </Sheet>
  )
}
