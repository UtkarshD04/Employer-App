import { useEffect, useState } from 'react'
import { Linking, Platform, Pressable, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as Clipboard from 'expo-clipboard'
import { useNavigation } from '@react-navigation/native'
import { Building, Calendar, Check, Clock, Code, Copy, FileText, Mail, MessageSquare, Phone, Plus, Smartphone, Sparkles, Users, Video } from 'lucide-react-native'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../store/workspace'
import { refreshPlan } from '../../services/plan'
import { getCredits, scheduleInterview, sendOutreach, setCandidateStage, unlockCandidate } from '../../services/talentApi'
import { getTalentMany, listJobs } from '../../services/talent'
import { agoDate, telHref } from '../../lib/tfmt'
import { PARTS, PART_LABEL, creditSpent, isRevealed } from '../../lib/reveal'
import { Banner, Btn, C, Field, Input, Select, Sheet, T } from '../wk'

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const contactOf = (c, candidate) => ({ email: c.email, phone: c.phone, candidateId: c.candidateId ?? candidate._live?.candidateId, revealed: c.revealed })
export const dial = (phone) => Linking.openURL(telHref(phone))

function Choice({ active, onPress, icon: Icon, children, disabled, tone = 'accent' }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, borderColor: active ? C.accent : C.line, backgroundColor: active ? C.accentSoft : '#fff', paddingHorizontal: 12, opacity: disabled ? 0.45 : 1 }}>
      {Icon ? <Icon size={14} color={active ? C.accent : C.ink2} /> : null}
      <T s={13} w="m" c={active ? C.accentText : C.ink}>{children}</T>
    </Pressable>
  )
}

// ---- shortlist picker -------------------------------------------------------

export function ShortlistModal({ ids, onClose }) {
  const { shortlists, createShortlist, addToShortlist, toast } = useWorkspace()
  const [name, setName] = useState('')
  const open = ids.length > 0
  const done = (list, added) => {
    // Mirror the shortlist into the backend pipeline, but only lift candidates still at 'shared' so nobody already interviewing is moved backwards.
    getTalentMany(ids).then((rows) => rows.filter((r) => r._live?.stage === 'shared').forEach((r) => setCandidateStage(r._live.candidateId, 'shortlisted').catch(() => {})))
    toast(added ? `${added} candidate${added === 1 ? '' : 's'} added to “${list.name}”` : `Already in “${list.name}”`)
    onClose(true)
  }
  return (
    <Sheet open={open} onClose={() => onClose(false)} title="Add to shortlist" subtitle={`${ids.length} candidate${ids.length === 1 ? '' : 's'}`}>
      <View style={{ gap: 6 }}>
        {shortlists.map((l) => {
          const all = ids.every((i) => l.candidateIds.includes(i))
          return (
            <Pressable key={l.id} onPress={() => done(l, addToShortlist(l.id, ids))} style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 }}>
              <T s={14} w="m" style={{ flex: 1 }}>{l.name} <T s={12} c={C.muted}> {l.candidateIds.length} candidates</T></T>
              {all ? <Check size={15} color={C.ok} /> : null}
            </Pressable>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Input value={name} onChangeText={setName} placeholder="New shortlist, e.g. Interview ready" style={{ flex: 1 }} />
        <Btn variant="primary" icon={Plus} disabled={!name.trim()} onPress={() => { const list = createShortlist(name); done(list, addToShortlist(list.id, ids)); setName('') }}>Create</Btn>
      </View>
    </Sheet>
  )
}

// ---- add to job -------------------------------------------------------------

export function AddToJobModal({ ids, onClose }) {
  const { toast } = useWorkspace()
  const [jobs, setJobs] = useState(null)
  const [err, setErr] = useState(false)
  const open = ids.length > 0
  useEffect(() => {
    if (open && !jobs) listJobs().then(setJobs).catch(() => setErr(true))
  }, [open, jobs])
  return (
    <Sheet open={open} onClose={onClose} title="Add to job" subtitle={`${ids.length} candidate${ids.length === 1 ? '' : 's'}`}>
      {err ? <T s={13} c={C.bad}>Couldn't load your jobs.</T> : null}
      {!jobs && !err ? <T s={13} c={C.muted}>Loading jobs…</T> : null}
      {jobs?.length === 0 ? <T s={13} c={C.muted}>You have no jobs yet. Post a job first.</T> : null}
      <View style={{ gap: 6 }}>
        {jobs?.map((j) => (
          <Pressable key={j.id} onPress={() => { toast('Candidates are attached to jobs by Mzobs when profiles are shared with you, so this is not editable from here yet.', { tone: 'warn' }); onClose() }} style={{ minHeight: 50, justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 }}>
            <T s={14} w="m">{j.title}</T>
          </Pressable>
        ))}
      </View>
    </Sheet>
  )
}

// ---- outreach ---------------------------------------------------------------

const TEMPLATES = {
  intro: { label: 'Personalised intro', body: (c, me) => `Hi ${c.name.split(' ')[0]},\n\nI came across your profile on Mzobs — your ${c.experienceYears} years as a ${c.designation}${c.skills.length ? ` working with ${c.skills.slice(0, 3).join(', ')}` : ''} stood out for a role we're hiring for.\n\nWould you be open to a short conversation this week to hear more?\n\nBest,\n${me}` },
  followup: { label: 'Follow-up', body: (c, me) => `Hi ${c.name.split(' ')[0]},\n\nFollowing up on my earlier note about an opening that fits your ${c.designation} background. If the timing isn't right, no problem — happy to reconnect later.\n\nBest,\n${me}` },
  invite: { label: 'Interview invitation', body: (c, me) => `Hi ${c.name.split(' ')[0]},\n\nThanks for your interest. We'd like to invite you to an interview. Please reply with two or three time slots that work for you this week.\n\nBest,\n${me}` },
  reminder: { label: 'Reminder', body: (c, me) => `Hi ${c.name.split(' ')[0]},\n\nA quick reminder about your upcoming conversation with us. Let me know if you need to reschedule.\n\nBest,\n${me}` },
  reject: { label: 'Rejection', body: (c, me) => `Hi ${c.name.split(' ')[0]},\n\nThank you for your time and interest. After careful consideration we won't be moving forward for this role, but we'll keep your profile in mind for future openings.\n\nWishing you the best,\n${me}` },
}
const CHANNELS = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'message', label: 'Message', icon: MessageSquare },
  { id: 'sms', label: 'SMS', icon: Smartphone },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, disabled: true },
]
// SMS goes out as one fixed message: India needs SMS wording pre-approved (DLT). Keep in sync with SMS_TEMPLATE_TEXT in the Backend's utils/outreach.js.
const smsFor = (c, company) => `Hi ${c.name.split(' ')[0]}, ${company || 'A company'} found your profile on Mzobs and would like to connect. Check your Mzobs account or email. - Mzobs`

export function OutreachModal({ candidates, channel: initial = 'email', onClose, onReveal }) {
  const { addMessage, toast } = useWorkspace()
  const { user, company: co } = useAuth()
  const [channel, setChannel] = useState(initial)
  const [tpl, setTpl] = useState('intro')
  const [subject, setSubject] = useState('An opportunity that fits your background')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const open = candidates.length > 0
  const first = candidates[0]
  const draft = (key) => TEMPLATES[key].body(first ?? { name: 'there', experienceYears: '', designation: 'professional', skills: [] }, 'The Hiring Team')
  useEffect(() => {
    if (open) { setChannel(initial); setTpl('intro'); setBody(draft('intro')); setSendErr('') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, first?.id, initial])
  const many = candidates.length > 1
  const personal = (c) => body.replace(/^Hi [^,]+,/, `Hi ${c.name.split(' ')[0]},`)

  const sendsFromHere = channel === 'email' || channel === 'sms'
  const part = channel === 'sms' ? 'phone' : 'email'
  const canSend = (c) => !!c._live?.candidateId && isRevealed(c, part)
  const ready = candidates.filter(canSend)
  const blocked = candidates.filter((c) => !canSend(c))
  const company = co?.name
  const smsBody = first ? smsFor(first, company) : ''

  const save = () => {
    candidates.forEach((c) => addMessage({ candidateId: c.id, candidateName: c.name, channel, subject: channel === 'email' ? subject : null, body: personal(c), state: 'draft' }))
    toast(`Saved ${candidates.length > 1 ? `${candidates.length} drafts` : 'draft'} to Messages`)
    onClose()
  }
  const send = async () => {
    setSending(true)
    setSendErr('')
    let sent = 0
    let lastError = ''
    for (const c of ready) {
      try {
        await sendOutreach(c, { channel, subject, body: personal(c) })
        sent += 1
        addMessage({ candidateId: c.id, candidateName: c.name, channel, subject: channel === 'email' ? subject : null, body: channel === 'sms' ? smsFor(c, company) : personal(c), state: 'sent' })
      } catch (e) {
        lastError = e.response?.data?.message ?? 'Could not send. Check your connection and try again.'
      }
    }
    setSending(false)
    if (sent) {
      const skipped = blocked.length ? ` · ${blocked.length} skipped (view their ${PART_LABEL[part]} first)` : ''
      toast(ready.length === 1 && !skipped ? `${channel === 'sms' ? 'SMS' : 'Email'} sent to ${ready[0].name}` : `Sent to ${sent} of ${candidates.length}${skipped}`)
    }
    if (lastError) setSendErr(sent ? `${lastError} (${sent} of ${ready.length} were sent.)` : lastError)
    else if (sent) onClose()
  }
  const copy = async () => {
    await Clipboard.setStringAsync(body)
    toast('Copied to clipboard')
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={many ? `Message ${candidates.length} candidates` : `Contact ${first?.name ?? ''}`}
      footer={
        sendsFromHere ? (
          <>
            {channel === 'email' ? <Btn icon={Copy} onPress={copy}>Copy</Btn> : null}
            {channel === 'email' ? <Btn onPress={save}>Save draft</Btn> : null}
            <Btn variant="primary" icon={channel === 'sms' ? Smartphone : Mail} loading={sending} disabled={ready.length === 0 || (channel === 'email' && (!subject.trim() || !body.trim()))} onPress={send}>
              {channel === 'sms' ? `Send SMS${ready.length > 1 ? ` to ${ready.length}` : ''}` : `Send email${ready.length > 1 ? ` to ${ready.length}` : ''}`}
            </Btn>
          </>
        ) : (
          <>
            <Btn icon={Copy} onPress={copy}>Copy</Btn>
            <Btn variant="primary" onPress={save}>Save draft to Messages</Btn>
          </>
        )
      }
    >
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CHANNELS.map((ch) => <Choice key={ch.id} icon={ch.icon} active={channel === ch.id} disabled={ch.disabled} onPress={() => { setChannel(ch.id); setSendErr('') }}>{ch.label}</Choice>)}
        </View>

        {sendsFromHere && blocked.length > 0 ? (
          <Banner>
            <T s={13} c={C.warn}>
              {many ? `${blocked.length} of ${candidates.length} candidates will be skipped — you haven't viewed their ${PART_LABEL[part]} yet.` : `To ${channel === 'sms' ? 'text' : 'email'} ${first.name.split(' ')[0]} from here, view their ${PART_LABEL[part]} first.`}
            </T>
            {!many && onReveal ? (
              <Pressable onPress={() => onReveal(first, part)} style={{ alignSelf: 'flex-start', marginTop: 8, borderRadius: 6, borderWidth: 1, borderColor: C.warn, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6 }}>
                <T s={12.5} w="s" c={C.warn}>View {PART_LABEL[part]} · {creditSpent(first) ? 'free' : '1 credit'}</T>
              </Pressable>
            ) : null}
          </Banner>
        ) : null}

        {channel === 'sms' ? (
          <View style={{ gap: 6 }}>
            <T s={12} w="m" c={C.muted}>The text message that will be sent</T>
            <Input value={many ? smsFor({ name: 'Name' }, company) : smsBody} editable={false} multiline style={{ backgroundColor: C.line2 }} />
          </View>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} color={C.accentText} />
                <T s={12} w="m" c={C.accentText} style={{ flex: 1 }}>Generate a draft — you can edit everything before it goes anywhere</T>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(TEMPLATES).map(([k, t]) => (
                  <Pressable key={k} onPress={() => { setTpl(k); setBody(draft(k)) }} style={{ borderRadius: 6, borderWidth: 1, borderColor: tpl === k ? '#a9dcd3' : C.line, backgroundColor: tpl === k ? C.aiSoft : '#fff', paddingHorizontal: 10, paddingVertical: 6 }}>
                    <T s={12.5} c={tpl === k ? C.accentText : C.ink}>{t.label}</T>
                  </Pressable>
                ))}
              </View>
            </View>
            {channel === 'email' ? <Input value={subject} onChangeText={setSubject} accessibilityLabel="Subject" /> : null}
            <Input value={body} onChangeText={setBody} multiline style={{ minHeight: 220 }} accessibilityLabel="Message" />
          </>
        )}

        {sendErr ? <Banner tone="bad">{sendErr}</Banner> : null}
        <T s={12} c={C.muted}>
          {sendsFromHere && channel === 'email'
            ? `Sent from Mzobs. ${many ? 'Replies' : `${first?.name?.split(' ')[0] ?? 'The candidate'}'s replies`} go to ${user?.email ?? 'your email'}. You can send at most 3 emails to the same candidate per day.`
            : sendsFromHere
              ? "SMS uses one fixed message approved for India (DLT), so it can't be edited. At most 3 texts to the same candidate per day."
              : 'Drafts are stored in Messages on this device until you send them by email or SMS.'}
        </T>
      </View>
    </Sheet>
  )
}

// ---- interview --------------------------------------------------------------

const TYPES = [
  { id: 'Phone', icon: Phone },
  { id: 'Video', icon: Video },
  { id: 'Technical', icon: Code },
  { id: 'HR', icon: Users },
  { id: 'On-site', icon: Building },
]
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function PickerField({ mode, value, onChange, placeholder, minimumDate }) {
  const [show, setShow] = useState(false)
  const label = value ? (mode === 'date' ? value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : value.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })) : placeholder
  return (
    <>
      <Pressable onPress={() => setShow(true)} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.line, borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 12 }}>
        <T s={14} c={value ? C.ink : C.ph}>{label}</T>
        {mode === 'date' ? <Calendar size={15} color={C.muted} /> : <Clock size={15} color={C.muted} />}
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode={mode}
          minimumDate={minimumDate}
          onChange={(_, d) => {
            setShow(Platform.OS === 'ios')
            if (d) onChange(d)
          }}
        />
      ) : null}
    </>
  )
}

export function InterviewModal({ candidate, onClose }) {
  const { toast } = useWorkspace()
  const [f, setF] = useState({ type: 'Video', date: null, time: null, interviewers: '', link: '', reminder: '1 hour before' })
  const set = (p) => setF((x) => ({ ...x, ...p }))
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (candidate) setF({ type: 'Video', date: null, time: null, interviewers: '', link: '', reminder: '1 hour before' }) }, [candidate?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const valid = f.date && f.time
  const submit = async () => {
    setBusy(true)
    try {
      await scheduleInterview({
        candidateId: candidate._live?.candidateId ?? candidate.id,
        role: candidate.designation || 'Interview',
        round: f.type,
        startsAt: new Date(`${ymd(f.date)}T${pad(f.time.getHours())}:${pad(f.time.getMinutes())}`).toISOString(),
        durationMins: 45,
        mode: f.type === 'On-site' ? 'On-site' : 'Video Call',
        meetingLink: f.link || undefined,
        location: f.type === 'On-site' ? 'Office' : undefined,
        panel: f.interviewers.split(',').map((x) => x.trim()).filter(Boolean),
      })
      toast(`Interview scheduled with ${candidate.name}`)
      onClose()
    } catch (e) {
      toast(e.response?.data?.message ?? 'Could not schedule the interview', { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open={!!candidate} onClose={onClose} title="Schedule interview" subtitle={candidate?.name} footer={<><Btn onPress={onClose}>Cancel</Btn><Btn variant="primary" disabled={!valid} loading={busy} onPress={submit}>Schedule</Btn></>}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TYPES.map((t) => <Choice key={t.id} icon={t.icon} active={f.type === t.id} onPress={() => set({ type: t.id })}>{t.id}</Choice>)}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="Date" style={{ flex: 1 }}><PickerField mode="date" value={f.date} onChange={(date) => set({ date })} placeholder="Pick a date" minimumDate={new Date()} /></Field>
          <Field label="Time" style={{ flex: 1 }}><PickerField mode="time" value={f.time} onChange={(time) => set({ time })} placeholder="Pick a time" /></Field>
        </View>
        <Field label="Interviewers"><Input value={f.interviewers} onChangeText={(interviewers) => set({ interviewers })} placeholder="Names, comma separated" /></Field>
        {f.type === 'Video' || f.type === 'Technical' ? <Field label="Meeting link"><Input value={f.link} onChangeText={(link) => set({ link })} placeholder="https://meet…" autoCapitalize="none" keyboardType="url" /></Field> : null}
        <Field label="Reminder"><Select value={f.reminder} onChange={(reminder) => set({ reminder })} options={['None', '15 minutes before', '1 hour before', '1 day before']} title="Reminder" /></Field>
        <T s={12} c={C.muted}>Saved to your Mzobs account. Phone, Technical and HR rounds are booked as a video call with the round name recorded.</T>
      </View>
    </Sheet>
  )
}

// ---- note / reminder --------------------------------------------------------

export function NoteModal({ candidate, kind = 'note', onClose }) {
  const { addNote, toast } = useWorkspace()
  const [text, setText] = useState('')
  useEffect(() => setText(''), [candidate?.id, kind])
  const label = kind === 'reminder' ? 'Reminder' : 'Note'
  return (
    <Sheet open={!!candidate} onClose={onClose} title={`Add ${label.toLowerCase()}`} subtitle={candidate?.name} footer={<><Btn onPress={onClose}>Cancel</Btn><Btn variant="primary" disabled={!text.trim()} onPress={() => { addNote(candidate.id, kind === 'reminder' ? `⏰ Reminder: ${text.trim()}` : text.trim()); toast(`${label} saved`); onClose() }}>Save</Btn></>}>
      <Input value={text} onChangeText={setText} multiline autoFocus placeholder={kind === 'reminder' ? 'Follow up on notice period…' : 'Private note for your team…'} />
    </Sheet>
  )
}

export function NotesList({ notes }) {
  if (!notes?.length) return <T s={13} c={C.muted}>No notes yet.</T>
  return (
    <View style={{ gap: 8 }}>
      {notes.map((n) => (
        <View key={n.id} style={{ borderRadius: 8, backgroundColor: C.line2, paddingHorizontal: 12, paddingVertical: 8 }}>
          <T s={13}>{n.text}</T>
          <T s={11} c={C.muted} style={{ marginTop: 2 }}>{agoDate(n.at)}</T>
        </View>
      ))}
    </View>
  )
}

// ---- unlock -----------------------------------------------------------------

export function UnlockModal({ candidate, field: part = 'phone', onClose, onCompose, onUnlocked, onViewResume }) {
  const { toast } = useWorkspace()
  const nav = useNavigation()
  const [wallet, setWallet] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [jobs, setJobs] = useState(null)
  const [jobId, setJobId] = useState('')
  // One CV credit buys a candidate once; email, phone and CV are then opened one at a time.
  const label = PART_LABEL[part] ?? 'details'
  const paid = creditSpent(candidate)
  const first = candidate?.name?.split(' ')[0]
  // A resume-database profile can join one of the company's jobs when it is first unlocked — optional.
  const needsJob = candidate?._live?.kind === 'resdex' && !candidate._live.candidateId
  useEffect(() => {
    setResult(null)
    setErr('')
    setJobs(null)
    setJobId('')
    if (!candidate) return
    getCredits().then((r) => setWallet(r.wallet)).catch(() => setWallet(null))
    // This part is already open → the backend returns it again without charging.
    if (isRevealed(candidate, part)) unlockCandidate(candidate, { field: part }).then(setResult).catch(() => {})
    else if (candidate._live?.kind === 'resdex' && !candidate._live.candidateId) {
      listJobs().then((list) => { setJobs(list); setJobId(list[0]?.id ?? '') }).catch(() => setJobs([]))
    }
  }, [candidate, part])

  const preview = candidate?._live?.contactPreview
  const previewLine = part === 'email' ? `Email ${preview?.email ?? '—'}` : part === 'phone' ? `Phone ${preview?.phone ?? '—'}` : 'The CV stays hidden until you view it'
  const unlock = async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await unlockCandidate(candidate, { field: part, jobId: needsJob ? jobId : undefined })
      setResult(r)
      setWallet(r.wallet)
      refreshPlan()
      onUnlocked?.(r)
      toast(r.alreadyUnlocked ? `${cap(label)} opened — no credit used` : `${cap(label)} opened (1 CV credit)`)
    } catch (e) {
      setErr(e.response?.status === 402 ? 'No CV credits left. Buy more under Plan & credits.' : e.response?.data?.message ?? 'Could not open this. Try again.')
    } finally {
      setBusy(false)
    }
  }
  const c = result?.candidate
  const credits = wallet?.remainingCredits
  const stillHidden = c ? PARTS.filter((p) => c.revealed && !c.revealed.includes(p)).map((p) => PART_LABEL[p]) : []
  const go = (route) => { onClose(); nav.navigate(route) }
  return (
    <Sheet
      open={!!candidate}
      onClose={onClose}
      title={c ? cap(label) : `View ${label}`}
      subtitle={candidate?.name}
      footer={
        c ? (
          <>
            <Btn onPress={onClose}>Done</Btn>
            {part === 'phone' && c.phone ? <Btn icon={Phone} onPress={() => dial(c.phone)}>Call now</Btn> : null}
            {part === 'phone' && c.phone && onCompose ? <Btn variant="primary" icon={Smartphone} onPress={() => onCompose(candidate, contactOf(c, candidate), 'sms')}>Send SMS</Btn> : null}
            {part === 'email' && c.email && onCompose ? <Btn variant="primary" icon={Mail} onPress={() => onCompose(candidate, contactOf(c, candidate), 'email')}>Write to candidate</Btn> : null}
          </>
        ) : (
          <>
            <Btn onPress={onClose}>Cancel</Btn>
            <Btn variant="primary" loading={busy} disabled={(!paid && credits === 0) || (needsJob && jobs === null)} onPress={unlock}>{paid ? `View ${label} · free` : `View ${label} · uses 1 credit`}</Btn>
          </>
        )
      }
    >
      {c ? (
        <View style={{ gap: 12 }}>
          {part === 'email' ? <View><T s={12} c={C.muted}>Email</T><T s={14} w="m">{c.email || '—'}</T></View> : null}
          {part === 'phone' ? <View><T s={12} c={C.muted}>Phone</T><T s={14} w="m">{c.phone || '—'}</T></View> : null}
          {part === 'resume' ? (c.resumeUrl ? <Btn icon={FileText} onPress={() => onViewResume?.(candidate, { url: c.resumeUrl, fileName: c.resumeFileName })}>Open CV</Btn> : <T s={12.5} c={C.muted}>No verified CV on this profile yet.</T>) : null}
          <T s={12.5} c={C.muted}>{stillHidden.length ? `${cap(stillHidden.join(' and '))} ${stillHidden.length === 1 ? 'stays' : 'stay'} hidden — view ${stillHidden.length === 1 ? 'it' : 'them'} any time, no more credits.` : `Everything for ${first} is open.`}</T>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {paid ? <T s={13.5}>You have already used the credit for {first}. Viewing the {label} is <T s={13.5} w="b">free</T>.</T> : <T s={13.5}>Viewing the {label} uses <T s={13.5} w="b">1 CV credit</T> — once for this candidate. Email, phone number and CV then each open with their own click, and you are never charged again for {first}.</T>}
          <View style={{ borderRadius: 8, backgroundColor: C.line2, paddingHorizontal: 12, paddingVertical: 8 }}><T s={13.5} c={C.ink2}>{previewLine}</T></View>
          {needsJob && jobs === null ? <T s={13.5} c={C.muted}>Loading your jobs…</T> : null}
          {needsJob && jobs?.length === 0 ? <T s={12.5} c={C.muted}>You have no jobs yet, so this is opened on its own. <T s={12.5} w="m" c={C.accent} onPress={() => go('JobForm')}>Post a job</T> to build a pipeline.</T> : null}
          {needsJob && jobs?.length > 0 ? (
            <Field label="Add to job (optional)" hint={jobId ? `${first} joins this job's pipeline, so you can shortlist and schedule interviews.` : 'Not added to any job pipeline.'}>
              <Select value={jobId} onChange={setJobId} title="Add to job" options={[...jobs.map((j) => [j.id, j.title]), ['', 'No specific job']]} />
            </Field>
          ) : null}
          {credits != null ? <T s={13.5} c={C.muted}>Credits available: <T s={13.5} w="b">{credits}</T>{credits === 0 && !paid ? <T s={13.5} w="m" c={C.accent} onPress={() => go('PlanCredits')}> · Buy credits</T> : null}</T> : null}
        </View>
      )}
      {err ? <Banner tone="bad" style={{ marginTop: 12 }}>{err}</Banner> : null}
    </Sheet>
  )
}
