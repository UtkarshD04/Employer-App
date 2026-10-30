import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { Check, Handshake } from 'lucide-react-native'
import { Btn, C, Field, Input, Sheet, T } from '../wk'
import { fmtDate } from './rc'
import { apiMessage, closeManagedRequest, createManagedRequest, listManagedRequests, MANAGED_STEPS } from '../../services/recruiter'

const URGENCY = [
  { id: 'standard', label: 'Standard', hint: 'Within a few working days' },
  { id: 'high', label: 'High', hint: 'Within 1–2 working days' },
  { id: 'urgent', label: 'Urgent', hint: 'As soon as possible' },
]
const box = () => ({ borderRadius: 12, borderWidth: 1, borderColor: C.aiLine, backgroundColor: C.accentTint, padding: 14 })

function StepTrack({ status }) {
  const at = MANAGED_STEPS.findIndex((s) => s.key === status)
  return (
    <View accessibilityLabel={`Status: ${MANAGED_STEPS[at]?.label}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {MANAGED_STEPS.map((s, i) => (
          <View key={s.key} style={{ flex: i < MANAGED_STEPS.length - 1 ? 1 : 0, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: i < at ? C.accent : C.surface, borderWidth: i < at ? 0 : i === at ? 2 : 1, borderColor: i === at ? C.accent : C.line }}>
              {i < at ? <Check size={11} color="#fff" strokeWidth={3} /> : <T s={10} w="b" c={i === at ? C.accent : C.muted} style={{ lineHeight: 13 }}>{i + 1}</T>}
            </View>
            {i < MANAGED_STEPS.length - 1 ? <View style={{ flex: 1, height: 1, marginHorizontal: 4, backgroundColor: i < at ? C.accent : C.line }} /> : null}
          </View>
        ))}
      </View>
      <T s={12} w="b" style={{ marginTop: 6 }}>{MANAGED_STEPS[at]?.label}</T>
    </View>
  )
}

// "Need help shortlisting?" — the MZOBS differentiator. Shows the open request's progress, or the call to action.
export default function ManagedShortlist({ job, canRequest, toast, onShortlistShared }) {
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ urgency: 'standard', idealProfile: '', notes: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const jobId = job?.id

  const load = useCallback(() => {
    if (jobId) listManagedRequests(jobId).then(setRows).catch(() => setRows([]))
  }, [jobId])
  useEffect(() => {
    setRows(null)
    load()
  }, [load])

  const current = rows?.find((r) => r.status !== 'closed') ?? null
  const live = job && !['draft', 'archived'].includes(job.status)

  const submit = async () => {
    setBusy(true)
    setErrors({})
    try {
      await createManagedRequest({ jobId, ...form })
      toast('Request sent to the MZOBS team')
      setOpen(false)
      setForm({ urgency: 'standard', idealProfile: '', notes: '' })
      load()
    } catch (e) {
      setErrors(e.response?.data?.errors ?? { form: apiMessage(e) })
    } finally {
      setBusy(false)
    }
  }
  const close = async () => {
    try {
      await closeManagedRequest(current.id)
      toast('Request closed')
      load()
    } catch (e) {
      toast(apiMessage(e), { tone: 'warn' })
    }
  }
  const confirmCancel = () => Alert.alert('Cancel this request?', undefined, [{ text: 'Keep it', style: 'cancel' }, { text: 'Cancel request', style: 'destructive', onPress: close }])

  if (!job || rows === null) return null
  return (
    <>
      {current ? (
        <View style={[box(), { gap: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Handshake size={16} color={C.accent} />
            <T s={13.5} w="b">MZOBS managed shortlisting</T>
          </View>
          <T s={12} c={C.muted}>Requested {fmtDate(current.createdAt)} · {current.urgency} priority{current.assignedTo ? ` · handled by ${current.assignedTo}` : ''}</T>
          <StepTrack status={current.status} />
          {current.status === 'shortlist_shared' ? (
            <View style={{ borderRadius: 10, backgroundColor: C.surface, padding: 12, gap: 6 }}>
              <T s={13} w="s">Shortlist ready · {current.sharedCandidates.length} candidate{current.sharedCandidates.length === 1 ? '' : 's'}</T>
              {current.shortlistMessage ? <T s={13} c={C.ink2}>{current.shortlistMessage}</T> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Btn size="sm" variant="primary" onPress={() => onShortlistShared?.()}>Show MZOBS shortlist</Btn>
                <Btn size="sm" onPress={close}>Close request</Btn>
              </View>
            </View>
          ) : canRequest ? (
            <Pressable onPress={confirmCancel} hitSlop={8} style={{ alignSelf: 'flex-start' }}><T s={12} w="s" c={C.muted}>Cancel request</T></Pressable>
          ) : null}
        </View>
      ) : live && canRequest ? (
        <View style={[box(), { gap: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Handshake size={20} color={C.accent} />
            <View style={{ flex: 1 }}>
              <T s={14} w="b">Need help shortlisting?</T>
              <T s={12.5} c={C.ink2}>Tell us who you are looking for and the MZOBS team will send you a curated shortlist.</T>
            </View>
          </View>
          <Btn variant="ai" size="sm" onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }}>Request a shortlist</Btn>
        </View>
      ) : null}
      <Sheet
        open={open}
        onClose={busy ? () => {} : () => setOpen(false)}
        title="Need help shortlisting?"
        subtitle={job.title}
        footer={<><Btn onPress={() => setOpen(false)} disabled={busy}>Cancel</Btn><Btn variant="ai" onPress={submit} loading={busy}>Send request</Btn></>}
      >
        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <T s={12.5} w="s" c={C.ink2}>How urgent is this?</T>
            {URGENCY.map((u) => {
              const on = form.urgency === u.id
              return (
                <Pressable key={u.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setForm((f) => ({ ...f, urgency: u.id }))} style={{ borderRadius: 10, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? C.accentTint : C.surface, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <T s={13} w="b">{u.label}</T>
                  <T s={11.5} c={C.muted}>{u.hint}</T>
                </Pressable>
              )
            })}
          </View>
          <Field label="Ideal candidate profile" error={errors.idealProfile} hint="Skills, experience, domain, seniority, anything that makes someone a clear yes.">
            <Input value={form.idealProfile} onChangeText={(v) => setForm((f) => ({ ...f, idealProfile: v }))} multiline maxLength={2000} error={errors.idealProfile} />
          </Field>
          <Field label="Notes (optional)" error={errors.notes}>
            <Input value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} multiline maxLength={1000} style={{ minHeight: 70 }} />
          </Field>
          {errors.form ? <T s={13} w="m" c={C.bad}>{errors.form}</T> : null}
        </View>
      </Sheet>
    </>
  )
}
