import { useCallback, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { CalendarPlus, ExternalLink, Gift, Lock, Mail, UserX } from 'lucide-react-native'
import { Avatar, Btn, C, Field, Input, Select, Sheet, T, Tag } from '../../wk'
import { PickerField } from '../ActionModals'
import SendMessageSheet from '../SendMessageSheet'
import { ErrorBlock, ListSkeleton, Overline, StagePill, ago, fmtDate, fmtDateTime, ymd } from '../rc'
import { addApplicantNote, apiMessage, getApplicant, listTeam, moveApplicant, PIPELINE, STAGE_LABEL, updateApplicant } from '../../../services/recruiter'

const EVENT_LABEL = { stage: 'Stage', note: 'Note', assign: 'Owner', tags: 'Tags', followup: 'Follow-up', interview: 'Interview', offer: 'Offer', comm: 'Message', reject: 'Rejected' }

function Section({ title, aside, children }) {
  return (
    <View style={{ gap: 8, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Overline>{title}</Overline>
        {aside}
      </View>
      {children}
    </View>
  )
}

export default function ApplicantSheet({ id, onClose, onChanged, onReject, onSchedule, can, toast }) {
  const nav = useNavigation()
  const [c, setC] = useState(null)
  const [error, setError] = useState('')
  const [team, setTeam] = useState([])
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [messaging, setMessaging] = useState(false)
  const manage = can('candidates.manage')

  const load = useCallback(() => {
    if (!id) return Promise.resolve()
    setError('')
    return getApplicant(id).then(setC).catch((e) => setError(apiMessage(e, 'Could not load this candidate.')))
  }, [id])
  useEffect(() => {
    setC(null)
    setNote('')
    load()
  }, [load])
  useEffect(() => {
    if (id) listTeam().then(setTeam).catch(() => setTeam([]))
  }, [id])

  const run = async (fn, ok) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast(ok)
      await load()
      onChanged()
    } catch (e) {
      toast(apiMessage(e), { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }

  const addTag = () => {
    const t = tag.trim()
    if (!t) return
    setTag('')
    run(() => updateApplicant(id, { tags: [...c.tags, t] }))
  }
  const openProfile = () => {
    onClose()
    nav.navigate('CandidateProfile', { id: c.id })
  }
  const toOffer = () => {
    onClose()
    nav.navigate('Offers', { candidate: c.id })
  }

  const asCandidate = c && { id: c.id, name: c.name, designation: c.currentRole || c.appliedFor, _live: { candidateId: c.id } }
  const terminal = c && c.stage === 'rejected'
  const owners = [['', 'Unassigned'], ...team.filter((m) => m.status !== 'disabled').map((m) => [m.id, m.name])]

  return (
    <Sheet open={!!id} onClose={onClose} title={c?.name ?? 'Candidate'} subtitle={c ? [c.currentRole, c.jobTitle].filter(Boolean).join(' · ') : undefined}>
      {error ? <ErrorBlock message={error} onRetry={load} /> : !c ? <ListSkeleton rows={6} /> : (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Avatar candidate={c} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <StagePill stage={c.stage} label={STAGE_LABEL[c.stage]} />
                {c.unlocked ? <T s={11.5} w="s" c={C.ok}>CV unlocked</T> : null}
              </View>
              <T s={12.5} c={C.muted}>{c.experienceYears} yrs · {c.location || 'Location not stated'} · applied {fmtDate(c.appliedAt)}</T>
            </View>
          </View>
          <Pressable onPress={openProfile} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 12 }}>
            <T s={12.5} w="s" c={C.accent}>Full profile</T><ExternalLink size={12} color={C.accent} />
          </Pressable>

          {manage ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
              <Btn size="sm" icon={CalendarPlus} disabled={!can('interviews.manage')} onPress={() => onSchedule(asCandidate)}>Schedule interview</Btn>
              <Btn size="sm" icon={Gift} disabled={!can('offers.manage')} onPress={toOffer}>Create offer</Btn>
              <Btn size="sm" icon={Mail} disabled={!can('templates.manage')} onPress={() => setMessaging(true)}>Message</Btn>
              {!terminal && can('candidates.reject') ? <Btn size="sm" icon={UserX} onPress={() => onReject(c)}>Reject</Btn> : null}
            </View>
          ) : null}

          <Section title="Pipeline">
            <Field label="Stage">
              <Select value={c.stage} title="Stage" disabled={!manage || busy} onChange={(v) => (v === 'rejected' ? onReject(c) : v !== c.stage && run(() => moveApplicant(id, v), `Moved to ${STAGE_LABEL[v]}`))} options={PIPELINE.map((s) => [s.key, s.label])} />
            </Field>
            <Field label="Owner">
              <Select value={c.owner?.id ?? ''} title="Owner" onChange={(v) => run(() => updateApplicant(id, { ownerId: v || null }), 'Owner updated')} options={owners} />
            </Field>
            <Field label="Follow-up date">
              <PickerField mode="date" value={c.followUpOn ? new Date(c.followUpOn) : null} placeholder="Pick a date" onChange={(d) => run(() => updateApplicant(id, { followUpOn: ymd(d) }), 'Follow-up saved')} />
              {c.followUpOn && manage ? <Pressable onPress={() => run(() => updateApplicant(id, { followUpOn: null }), 'Follow-up cleared')} hitSlop={8} style={{ alignSelf: 'flex-start' }}><T s={12} w="s" c={C.accent}>Clear date</T></Pressable> : null}
            </Field>
            <View style={{ gap: 6, marginTop: 4 }}>
              <T s={12.5} w="s" c={C.ink2}>Internal tags</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                {c.tags.map((t) => (
                  <Pressable key={t} disabled={!manage} onPress={() => run(() => updateApplicant(id, { tags: c.tags.filter((x) => x !== t) }))} accessibilityLabel={`Remove tag ${t}`}>
                    <Tag>{manage ? `${t}  ×` : t}</Tag>
                  </Pressable>
                ))}
                {c.tags.length === 0 ? <T s={12.5} c={C.muted}>No tags</T> : null}
              </View>
              {manage ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Input value={tag} onChangeText={setTag} maxLength={30} placeholder="Add a tag, e.g. Strong referral" onSubmitEditing={addTag} returnKeyType="done" style={{ flex: 1 }} />
                  <Btn size="sm" disabled={busy || !tag.trim()} onPress={addTag} style={{ alignSelf: 'center' }}>Add</Btn>
                </View>
              ) : null}
            </View>
          </Section>

          <Section title="Private notes" aside={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Lock size={11} color={C.muted} /><T s={11.5} c={C.muted}>Your team only</T></View>}>
            {manage ? (
              <View style={{ gap: 6 }}>
                <Input value={note} onChangeText={setNote} multiline maxLength={2000} placeholder="Add a note about this candidate" style={{ minHeight: 70 }} />
                <Btn size="sm" variant="primary" disabled={busy || note.trim().length < 2} onPress={() => run(async () => { await addApplicantNote(id, note.trim()); setNote('') }, 'Note added')} style={{ alignSelf: 'flex-end' }}>Add note</Btn>
              </View>
            ) : null}
            {c.notes.length === 0 ? <T s={12.5} c={C.muted}>No notes yet.</T> : c.notes.map((n) => (
              <View key={n.id} style={{ borderRadius: 10, backgroundColor: '#faf9f6', paddingHorizontal: 12, paddingVertical: 8 }}>
                <T s={13}>{n.kind === 'rejection' ? <T s={13} w="b" c="#9a3a2c">Internal rejection reason: </T> : null}{n.text}</T>
                <T s={11.5} c={C.muted} style={{ marginTop: 2 }}>{n.byName} · {fmtDateTime(n.at)}</T>
              </View>
            ))}
          </Section>

          {c.interviews.length > 0 ? (
            <Section title="Interviews" aside={<Pressable onPress={() => { onClose(); nav.navigate('Interviews') }} hitSlop={8}><T s={12} w="s" c={C.accent}>Open</T></Pressable>}>
              {c.interviews.map((i) => (
                <View key={i.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <T s={13} style={{ flex: 1 }}>{i.round || 'Interview'} · {fmtDateTime(i.startsAt)}</T>
                  <T s={12.5} c={C.muted}>{i.status} · {i.scorecards} scorecard{i.scorecards === 1 ? '' : 's'}</T>
                </View>
              ))}
            </Section>
          ) : null}

          <Section title="Activity history">
            <View style={{ marginLeft: 6, borderLeftWidth: 1, borderLeftColor: C.line }}>
              {c.events.length === 0 ? <T s={12.5} c={C.muted} style={{ paddingLeft: 14 }}>Nothing recorded yet.</T> : c.events.map((e) => (
                <View key={e.id} style={{ paddingLeft: 14, paddingBottom: 12 }}>
                  <View style={{ position: 'absolute', left: -3.5, top: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: '#9db0bd' }} />
                  <T s={13}><T s={11} w="b" c={C.muted} style={{ textTransform: 'uppercase' }}>{EVENT_LABEL[e.type] ?? e.type}  </T>{e.text}</T>
                  <T s={11.5} c={C.muted}>{[e.actorName, ago(e.at)].filter(Boolean).join(' · ')}</T>
                </View>
              ))}
            </View>
          </Section>
        </View>
      )}
      <SendMessageSheet candidate={messaging ? asCandidate : null} onClose={() => setMessaging(false)} onSent={() => { load(); onChanged() }} toast={toast} />
    </Sheet>
  )
}
