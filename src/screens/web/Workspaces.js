import { useEffect, useMemo, useState } from 'react'
import { Alert, Linking, View } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { calendarLink } from '../../lib/calendar'
import { CalendarClock, CalendarDays, CalendarPlus, Clock, MapPin, Mail, MessageSquare, Sparkles, Users, Video } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { EmailOption, emailOutcome, PickerField } from '../../components/web/ActionModals'
import { useActions } from '../../components/web/useActions'
import { makeCriteria, STAGE_LABELS } from '../../lib/talent/criteria'
import { listInterviewable } from '../../services/talent'
import { AI_PROMPTS } from '../../components/web/AskAI'
import { Avatar, Btn, C, Chip, EmptyState, Field, Input, Press, Sheet, Skeleton, T, card } from '../../components/wk'
import { cancelInterview, listInterviews, rescheduleInterview, submitFeedback } from '../../services/interviewsService'
import ScorecardSheet from '../../components/web/ScorecardSheet'
import { usePermissions } from '../../services/recruiter'
import { FadeIn, useRefresh } from '../../components/web/rc'
import { queryKeys } from '../../lib/queryClient'
import { errorMessage } from '../../lib/api'
import { useWorkspace } from '../../store/workspace'
import { useAskAI } from '../../store/askai'
import { agoDate } from '../../lib/tfmt'

/** Messages composed on this device (sent from a candidate's Contact window, or saved as drafts). */
export function LocalMessages() {
  const { messages } = useWorkspace()
  return (
    <View style={{ gap: 20 }}>
      {messages.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No messages yet" body="Use Contact on a candidate to email or text them — once you have viewed their email or phone number." />
      ) : (
        <View style={{ gap: 8 }}>
          {messages.map((m) => (
            <View key={m.id} style={[card, { padding: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <T s={14} w="s" numberOfLines={1} style={{ flexShrink: 1 }}>{m.candidateName}</T>
                  <View style={{ borderRadius: 4, backgroundColor: C.line2, paddingHorizontal: 6, paddingVertical: 2 }}><T s={11} w="m" c={C.muted}>{String(m.channel).toUpperCase()}</T></View>
                </View>
                <T s={12} w={m.state === 'sent' ? 'm' : 'r'} c={m.state === 'sent' ? C.okText : C.muted}>{m.state === 'sent' ? 'Sent' : 'Draft'} · {agoDate(m.at)}</T>
              </View>
              {m.subject ? <T s={13} w="m" style={{ marginTop: 4 }}>{m.subject}</T> : null}
              <T s={13} c={C.ink2} numberOfLines={3} style={{ marginTop: 4 }}>{m.body}</T>
            </View>
          ))}
        </View>
      )}
      <T s={12} c={C.muted}>This list is stored on this device. Drafts are not delivered until you send them from the candidate's Contact window.</T>
    </View>
  )
}

const MON = (d) => d.toLocaleDateString('en-IN', { month: 'short' })
const WKD = (d) => d.toLocaleDateString('en-IN', { weekday: 'short' })
const clock = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
const isUpcoming = (i) => !['Cancelled', 'Completed'].includes(i.status) && new Date(i.startsAt).getTime() + (i.durationMins ?? 30) * 60000 >= Date.now()

// "Today", "Tomorrow", "In 3 days" — by calendar day, not hours.
function relativeDay(date) {
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((day(date) - day(new Date())) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`
}

const EMAIL_NOTE = { failed: 'Email could not be sent', not_configured: 'Email not sent (mail isn\u2019t set up)', no_email: 'Email not sent (no address on file)', not_allowed: 'Email not sent (address not unlocked)' }

function InterviewCard({ i, past, onReschedule, onCancel, onComplete, onScorecard }) {
  const d = new Date(i.startsAt)
  const fb = i.feedbackState
  const scorecards = i.scorecards ?? []
  const end = i.durationMins ? new Date(d.getTime() + i.durationMins * 60000) : null
  const cancelled = i.status === 'Cancelled'
  const video = i.mode !== 'On-site'
  const [bg, fg] = tones()[i.status] ?? [C.blueSoft, C.blueText]
  const active = !past && !['Cancelled', 'Completed'].includes(i.status)
  const started = d <= new Date()
  // Today's interviews get a solid date tile so they stand out in the list.
  const isToday = !past && !cancelled && relativeDay(d) === 'Today'
  const tileFg = cancelled ? C.muted : isToday ? '#fff' : C.accentText
  const manageable = !['Cancelled', 'Completed'].includes(i.status) && (onReschedule || onCancel || onComplete)
  const sent = i.email?.status === 'sent'
  return (
    <View style={[card, { padding: 14, gap: 12, opacity: past || cancelled ? 0.8 : 1 }]}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={{ width: 64, height: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: cancelled ? C.line2 : isToday ? C.accent : C.accentSoft }}>
          <T s={11} w="b" c={tileFg} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{MON(d)}</T>
          <T s={27} w="b" c={tileFg} style={{ lineHeight: 30 }}>{d.getDate()}</T>
          <T s={11} w="m" c={tileFg}>{WKD(d)}</T>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <T s={15.5} w="b" numberOfLines={1} style={cancelled ? { textDecorationLine: 'line-through' } : undefined}>{i.candidateName}</T>
              <T s={12.5} c={C.muted} numberOfLines={1}>{[i.role, i.round].filter(Boolean).join(' · ') || 'Interview'}</T>
            </View>
            <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: bg, paddingHorizontal: 9, paddingVertical: 3 }}><T s={11.5} w="s" c={fg}>{i.status ?? 'Planned'}</T></View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Clock size={14} color={C.accent} /><T s={13.5} w="s">{clock(d)}{end ? ` – ${clock(end)}` : ''}</T></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{video ? <Video size={14} color={C.muted} /> : <MapPin size={14} color={C.muted} />}<T s={13} c={C.ink2} numberOfLines={2} style={{ flex: 1 }}>{video ? 'Video call' : i.location || 'On-site'}</T></View>
          {active ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CalendarClock size={14} color={C.accentText} /><T s={13} w="m" c={C.accentText}>{relativeDay(d)}</T></View> : null}
        </View>
      </View>
      {fb?.pending ? (
        <View style={{ borderRadius: 8, backgroundColor: fb.overdue ? '#f5e9e7' : C.warnSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
          <T s={13} w="s" c={fb.overdue ? '#9a3a2c' : C.warn}>
            {fb.overdue ? 'Feedback overdue' : 'Feedback pending'}
            {fb.awaiting?.length > 0 ? <T s={13} c={fb.overdue ? '#9a3a2c' : C.warn}> · waiting on {fb.awaiting.map((a) => a.name).join(', ')}</T> : null}
            {i.feedbackDueOn ? <T s={13} c={fb.overdue ? '#9a3a2c' : C.warn}> · due {new Date(i.feedbackDueOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</T> : null}
          </T>
        </View>
      ) : null}
      {scorecards.length > 0 ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: C.line2, backgroundColor: '#faf9f6', paddingHorizontal: 12, paddingVertical: 8, gap: 2 }}>
          <T s={11.5} w="b" c={C.ink2} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Scorecards{i.overallRating != null ? <T s={12} w="r" c={C.ink} style={{ textTransform: 'none' }}> · <T s={12} w="b">{i.overallRating}</T>/5 average</T> : null}</T>
          {scorecards.map((sc) => (
            <View key={sc.interviewer} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <T s={12.5}>{sc.interviewerName}</T>
              <T s={12.5} w="s">{sc.recommendation}</T>
            </View>
          ))}
        </View>
      ) : null}
      {(i.panel ?? []).length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Users size={13} color={C.muted} />
          {i.panel.map((p) => <View key={p} style={{ borderRadius: 999, backgroundColor: C.line2, paddingHorizontal: 8, paddingVertical: 2 }}><T s={12} w="m" c={C.ink2}>{p}</T></View>)}
        </View>
      ) : null}
      {i.email?.status ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Mail size={12} color={sent ? C.okText : C.muted} /><T s={12} c={sent ? C.okText : C.muted}>{sent ? `Email sent to ${i.email.to}` : EMAIL_NOTE[i.email.status]}</T></View>
      ) : null}
      {active ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {i.meetingLink ? <Btn variant="primary" size="sm" icon={Video} onPress={() => Linking.openURL(i.meetingLink)}>Join interview</Btn> : null}
          <Btn size="sm" icon={CalendarPlus} onPress={() => Linking.openURL(calendarLink(i))}>Add to calendar</Btn>
        </View>
      ) : null}
      {i.status !== 'Cancelled' && ((onScorecard && started) || manageable) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {manageable && onReschedule ? <Btn size="sm" onPress={() => onReschedule(i)}>Reschedule</Btn> : null}
          {onScorecard && started ? <Btn size="sm" variant="success" onPress={() => onScorecard(i)}>Scorecard</Btn> : null}
          {manageable && onComplete && (past || !active) ? <Btn size="sm" onPress={() => onComplete(i)}>Mark completed</Btn> : null}
          {manageable && onCancel ? <Btn size="sm" variant="ghost" onPress={() => onCancel(i)} textStyle={{ color: C.bad }}>Cancel</Btn> : null}
        </View>
      ) : null}
    </View>
  )
}

const tones = () => ({ Confirmed: [C.okSoft, C.okText], 'Awaiting confirmation': [C.warnSoft, C.warn], Rescheduled: ['#f1eefc', '#6d4fc7'], Completed: [C.blueSoft, C.blueText], Cancelled: [C.line2, C.muted] })

// Pick who to interview, then hand over to the usual scheduling form.
function SchedulePicker({ open, onClose, onPick }) {
  const [rows, setRows] = useState(null)
  const [text, setText] = useState('')
  useEffect(() => {
    if (!open) return
    setRows(null)
    setText('')
    listInterviewable().then(setRows).catch(() => setRows([]))
  }, [open])
  const shown = useMemo(() => {
    const order = { shortlisted: 0, interviewing: 1, offered: 2, shared: 3 }
    const t = text.trim().toLowerCase()
    const list = (rows ?? []).filter((c) => !t || [c.name, c.designation, c.jobTitle, c.appliedFor].some((v) => v?.toLowerCase().includes(t)))
    return list.sort((a, b) => (order[a._live?.stage] ?? 9) - (order[b._live?.stage] ?? 9))
  }, [rows, text])
  return (
    <Sheet open={open} onClose={onClose} title="Schedule an interview" subtitle="Choose a candidate from your pipeline">
      <Input value={text} onChangeText={setText} placeholder="Search by name or role" />
      {rows === null ? <T s={13} c={C.muted} style={{ marginTop: 12 }}>Loading your pipeline…</T> : null}
      {rows && shown.length === 0 ? <EmptyState icon={CalendarDays} title={rows.length ? 'No match' : 'No one to interview yet'} body={rows.length ? 'Try a different name or role.' : 'Candidates you shortlist or receive for a job show up here.'} /> : null}
      <View style={{ gap: 8, marginTop: 12 }}>
        {shown.map((c) => (
          <Press key={c.id} onPress={() => onPick(c)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Avatar candidate={c} size={34} />
            <View style={{ flex: 1 }}>
              <T s={14} w="m" numberOfLines={1}>{c.name}</T>
              <T s={12.5} c={C.muted} numberOfLines={1}>{c.designation || c.appliedFor}{c.jobTitle ? ` · ${c.jobTitle}` : ''}</T>
            </View>
            {c._live?.stage ? <Chip tone={c._live.stage === 'shortlisted' ? 'accent' : 'neutral'}>{STAGE_LABELS[c._live.stage] ?? c._live.stage}</Chip> : null}
          </Press>
        ))}
      </View>
    </Sheet>
  )
}

export function InterviewsScreen() {
  const qc = useQueryClient()
  const route = useRoute()
  const { toast } = useWorkspace()
  const { me, can } = usePermissions()
  const feedbackOnly = route.params?.filter === 'feedback'
  const [scoring, setScoring] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [note, setNote] = useState('')
  const q = useQuery({ queryKey: queryKeys.interviews, queryFn: listInterviews })
  const [picking, setPicking] = useState(false)
  const { onAction, host } = useActions(makeCriteria(), { onInterviewScheduled: () => qc.invalidateQueries({ queryKey: queryKeys.interviews }) })
  const [resched, setResched] = useState(null)
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resEmail, setResEmail] = useState(true)
  const interviews = q.data ?? []
  const { refreshing, onRefresh } = useRefresh(q.refetch)

  const openResched = (i) => {
    const d = new Date(i.startsAt)
    setDate(d)
    setTime(d)
    setResEmail(true)
    setResched(i)
  }
  const confirmResched = async () => {
    const d = new Date(date)
    d.setHours(time.getHours(), time.getMinutes(), 0, 0)
    setBusy(true)
    try {
      const updated = await rescheduleInterview(resched.id, { startsAt: d.toISOString(), notifyByEmail: resEmail })
      const mail = emailOutcome(resEmail, updated?.email)
      toast(`Interview rescheduled. The candidate is notified in Mzobs.${mail.text}`, mail.warn ? { tone: 'warn' } : undefined)
      setResched(null)
      qc.invalidateQueries({ queryKey: queryKeys.interviews })
    } catch (e) {
      toast(errorMessage(e), { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }
  const doCancel = (i, notifyByEmail) =>
    cancelInterview(i.id, { notifyByEmail })
      .then((updated) => {
        const mail = emailOutcome(notifyByEmail, updated?.email)
        toast(`Interview cancelled.${mail.text}`, mail.warn ? { tone: 'warn' } : undefined)
        qc.invalidateQueries({ queryKey: queryKeys.interviews })
      })
      .catch((e) => toast(errorMessage(e), { tone: 'warn' }))
  const cancel = (i) =>
    Alert.alert('Cancel this interview?', 'The candidate is notified in Mzobs. You can also email them.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel only', style: 'destructive', onPress: () => doCancel(i, false) },
      { text: 'Cancel and email', style: 'destructive', onPress: () => doCancel(i, true) },
    ])

  const confirmComplete = async () => {
    setBusy(true)
    try {
      await submitFeedback(completing.id, { feedback: { notes: note.trim() } })
      toast('Interview marked completed')
      setCompleting(null)
      qc.invalidateQueries({ queryKey: queryKeys.interviews })
    } catch (e) {
      toast(errorMessage(e), { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }
  const refreshInterviews = () => qc.invalidateQueries({ queryKey: queryKeys.interviews })
  const actions = {
    ...(can('interviews.manage') && { onReschedule: openResched, onCancel: cancel, onComplete: (i) => { setNote(''); setCompleting(i) } }),
    ...(can('interviews.feedback') && { onScorecard: setScoring }),
  }

  // Interviews still owed feedback come first and are not repeated under "Needs update".
  const pending = interviews.filter((i) => i.feedbackState?.pending).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  const owed = new Set(pending.map((i) => i.id))
  const upcoming = interviews.filter((i) => isUpcoming(i) && !owed.has(i.id)).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  // Time has passed but still not completed or cancelled: keep these visible and actionable.
  const isOverdue = (i) => !['Cancelled', 'Completed'].includes(i.status) && !isUpcoming(i)
  const overdue = interviews.filter((i) => isOverdue(i) && !owed.has(i.id)).sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
  const past = interviews.filter((i) => !isUpcoming(i) && !isOverdue(i) && !owed.has(i.id)).sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
  const heading = { textTransform: 'uppercase', letterSpacing: 0.8 }

  return (
    <Shell>
      <PageScroll onRefresh={onRefresh} refreshing={refreshing}>
        <PageTitle title="Interviews" sub="Interviews you've scheduled with candidates." />
        {can('interviews.manage') ? <Btn variant="primary" icon={CalendarPlus} onPress={() => setPicking(true)} style={{ alignSelf: 'flex-start' }}>Schedule interview</Btn> : null}
        {q.isLoading ? (
          <View style={{ gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={72} r={16} />)}</View>
        ) : q.isError ? (
          <EmptyState icon={CalendarDays} title="Couldn't load interviews" action={<Btn onPress={() => q.refetch()}>Retry</Btn>} />
        ) : interviews.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No interviews scheduled" body="Choose Schedule interview to pick a candidate from your pipeline, or open a candidate and schedule from their profile." />
        ) : (
          <View style={{ gap: 22 }}>
            {pending.length > 0 ? (
              <View style={{ gap: 10 }}>
                <T s={12.5} w="b" c={C.muted} style={heading}>Feedback pending · {pending.length}</T>
                <T s={12.5} c={C.muted}>Each interviewer submits a scorecard; the interview is marked completed once everyone on the panel has.</T>
                {pending.map((i) => <InterviewCard key={i.id} i={i} past {...actions} />)}
              </View>
            ) : null}
            {feedbackOnly && pending.length === 0 ? <T s={13.5} c={C.muted} style={{ textAlign: 'center', paddingVertical: 20 }}>No interviews are waiting for feedback.</T> : null}
            {!feedbackOnly ? (
              <View style={{ gap: 10 }}>
                <T s={12.5} w="b" c={C.muted} style={heading}>Upcoming · {upcoming.length}</T>
                {upcoming.length === 0 ? <T s={13.5} c={C.muted}>Nothing coming up. Schedule one with the button above.</T> : upcoming.map((i, k) => <FadeIn key={i.id} index={k}><InterviewCard i={i} {...actions} /></FadeIn>)}
              </View>
            ) : null}
            {!feedbackOnly && overdue.length > 0 ? (
              <View style={{ gap: 10 }}>
                <T s={12.5} w="b" c={C.muted} style={heading}>Needs update · {overdue.length}</T>
                <T s={12.5} c={C.muted}>The time has passed and these aren&apos;t marked completed or cancelled yet.</T>
                {overdue.map((i) => <InterviewCard key={i.id} i={i} past {...actions} />)}
              </View>
            ) : null}
            {!feedbackOnly && past.length > 0 ? (
              <View style={{ gap: 10 }}>
                <T s={12.5} w="b" c={C.muted} style={heading}>Past and cancelled · {past.length}</T>
                {past.map((i) => <InterviewCard key={i.id} i={i} past onScorecard={actions.onScorecard} />)}
              </View>
            ) : null}
          </View>
        )}
      </PageScroll>

      <ScorecardSheet interview={scoring} myId={me?.id} onClose={() => setScoring(null)} onSaved={refreshInterviews} toast={toast} />
      <Sheet open={!!completing} onClose={() => setCompleting(null)} title="Mark interview completed" subtitle={completing?.candidateName} footer={<><Btn onPress={() => setCompleting(null)}>Close</Btn><Btn variant="primary" loading={busy} disabled={!note.trim()} onPress={confirmComplete}>Mark completed</Btn></>}>
        <Field label="How did it go? (private note)"><Input value={note} onChangeText={setNote} multiline /></Field>
      </Sheet>
      <SchedulePicker open={picking} onClose={() => setPicking(false)} onPick={(c) => { setPicking(false); onAction('interview', c) }} />
      {host}

      <Sheet open={!!resched} onClose={() => setResched(null)} title="Reschedule interview" subtitle={resched?.candidateName} footer={<><Btn onPress={() => setResched(null)}>Cancel</Btn><Btn variant="primary" loading={busy} onPress={confirmResched}>Confirm new time</Btn></>}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="Date" style={{ flex: 1 }}><PickerField mode="date" value={date} onChange={setDate} minimumDate={new Date()} placeholder="Pick a date" /></Field>
          <Field label="Time" style={{ flex: 1 }}><PickerField mode="time" value={time} onChange={setTime} placeholder="Pick a time" /></Field>
        </View>
        <View style={{ marginTop: 12 }}><EmailOption value={resEmail} onChange={setResEmail} label="Email the candidate the new time" sub="They are also notified in Mzobs." /></View>
      </Sheet>
    </Shell>
  )
}

export function AITalentScreen() {
  const askAI = useAskAI()
  return (
    <Shell>
      <PageScroll>
        <PageTitle title="AI Talent" sub="Ask Mzobs AI to do the legwork." />
        <View style={{ gap: 12 }}>
          {AI_PROMPTS.map((p) => (
            <View key={p.label} style={[card, { padding: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} color={C.ai} />
                <T s={14} w="s" style={{ flex: 1 }}>{p.label}</T>
              </View>
              <T s={13} c={C.muted} style={{ marginTop: 4 }}>{p.hint}</T>
              {p.ready ? (
                <Btn size="sm" variant="ai" onPress={askAI.open} style={{ marginTop: 12, alignSelf: 'flex-start' }}>Try it</Btn>
              ) : (
                <View style={{ marginTop: 12, alignSelf: 'flex-start', borderRadius: 6, backgroundColor: C.line2, paddingHorizontal: 8, paddingVertical: 2 }}><T s={11.5} w="m" c={C.muted}>Needs the Mzobs AI service</T></View>
              )}
            </View>
          ))}
        </View>
      </PageScroll>
    </Shell>
  )
}
