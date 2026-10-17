import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Linking, View } from 'react-native'
import { BarChart3, CalendarClock, CalendarDays, CalendarPlus, Clock, MapPin, Mail, MessageSquare, Sparkles, Users, Video } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { EmailOption, emailOutcome, PickerField } from '../../components/web/ActionModals'
import { useActions } from '../../components/web/useActions'
import { makeCriteria, STAGE_LABELS } from '../../lib/talent/criteria'
import { listInterviewable } from '../../services/talent'
import { AI_PROMPTS } from '../../components/web/AskAI'
import { Avatar, Btn, C, Chip, EmptyState, Field, Input, Press, Sheet, Skeleton, T, card } from '../../components/wk'
import { cancelInterview, listInterviews, rescheduleInterview } from '../../services/interviewsService'
import { queryKeys } from '../../lib/queryClient'
import { errorMessage } from '../../lib/api'
import { useWorkspace } from '../../store/workspace'
import { useAskAI } from '../../store/askai'
import { agoDate } from '../../lib/tfmt'

export function MessagesScreen() {
  const { messages } = useWorkspace()
  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Messages" sub="Emails and texts you sent from candidate profiles, and drafts you saved." />
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
      </PageScroll>
    </Shell>
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

function InterviewCard({ i, past, onReschedule, onCancel }) {
  const d = new Date(i.startsAt)
  const end = i.durationMins ? new Date(d.getTime() + i.durationMins * 60000) : null
  const cancelled = i.status === 'Cancelled'
  const video = i.mode !== 'On-site'
  const [bg, fg] = tone[i.status] ?? [C.blueSoft, '#1f6fb2']
  const active = !past && !['Cancelled', 'Completed'].includes(i.status)
  const sent = i.email?.status === 'sent'
  return (
    <View style={[card, { padding: 14, gap: 12, opacity: past || cancelled ? 0.8 : 1 }]}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={{ width: 64, height: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: cancelled ? C.line2 : C.accentSoft }}>
          <T s={11} w="b" c={cancelled ? C.muted : C.accentText} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{MON(d)}</T>
          <T s={27} w="b" c={cancelled ? C.muted : C.accentText} style={{ lineHeight: 30 }}>{d.getDate()}</T>
          <T s={11} w="m" c={cancelled ? C.muted : C.accentText}>{WKD(d)}</T>
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
      {(i.panel ?? []).length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Users size={13} color={C.muted} />
          {i.panel.map((p) => <View key={p} style={{ borderRadius: 999, backgroundColor: C.line2, paddingHorizontal: 8, paddingVertical: 2 }}><T s={12} w="m" c={C.ink2}>{p}</T></View>)}
        </View>
      ) : null}
      {i.email?.status ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Mail size={12} color={sent ? C.okText : C.muted} /><T s={12} c={sent ? C.okText : C.muted}>{sent ? `Email sent to ${i.email.to}` : EMAIL_NOTE[i.email.status]}</T></View>
      ) : null}
      {i.meetingLink && active ? <Btn variant="primary" size="sm" icon={Video} onPress={() => Linking.openURL(i.meetingLink)} style={{ alignSelf: 'flex-start' }}>Join interview</Btn> : null}
      {active ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn size="sm" onPress={() => onReschedule(i)}>Reschedule</Btn>
          <Btn size="sm" variant="ghost" onPress={() => onCancel(i)} textStyle={{ color: C.bad }}>Cancel</Btn>
        </View>
      ) : null}
    </View>
  )
}

const tone = { Confirmed: [C.okSoft, C.okText], 'Awaiting confirmation': [C.warnSoft, C.warn], Rescheduled: ['#f1eefc', '#6d4fc7'], Completed: [C.blueSoft, '#1f6fb2'], Cancelled: [C.line2, C.muted] }

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
  const { toast } = useWorkspace()
  const q = useQuery({ queryKey: queryKeys.interviews, queryFn: listInterviews })
  const [picking, setPicking] = useState(false)
  const { onAction, host } = useActions(makeCriteria(), { onInterviewScheduled: () => qc.invalidateQueries({ queryKey: queryKeys.interviews }) })
  const [resched, setResched] = useState(null)
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resEmail, setResEmail] = useState(true)
  const interviews = q.data ?? []

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

  const upcoming = interviews.filter(isUpcoming).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  // Time has passed but still not completed or cancelled: keep these visible and actionable.
  const isOverdue = (i) => !['Cancelled', 'Completed'].includes(i.status) && !isUpcoming(i)
  const overdue = interviews.filter(isOverdue).sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
  const past = interviews.filter((i) => !isUpcoming(i) && !isOverdue(i)).sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))

  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Interviews" sub="Interviews you've scheduled with candidates." />
        <Btn variant="primary" icon={CalendarPlus} onPress={() => setPicking(true)} style={{ alignSelf: 'flex-start' }}>Schedule interview</Btn>
        {q.isLoading ? (
          <View style={{ gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={72} r={16} />)}</View>
        ) : q.isError ? (
          <EmptyState icon={CalendarDays} title="Couldn't load interviews" action={<Btn onPress={() => q.refetch()}>Retry</Btn>} />
        ) : interviews.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No interviews scheduled" body="Choose Schedule interview to pick a candidate from your pipeline, or open a candidate and schedule from their profile." />
        ) : (
          <View style={{ gap: 22 }}>
            <View style={{ gap: 10 }}>
              <T s={12.5} w="b" c={C.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Upcoming · {upcoming.length}</T>
              {upcoming.length === 0 ? <T s={13.5} c={C.muted}>Nothing coming up. Schedule one with the button above.</T> : upcoming.map((i) => <InterviewCard key={i.id} i={i} onReschedule={openResched} onCancel={cancel} />)}
            </View>
            {overdue.length > 0 ? (
              <View style={{ gap: 10 }}>
                <T s={12.5} w="b" c={C.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Needs update · {overdue.length}</T>
                <T s={12.5} c={C.muted}>The time has passed and these aren&apos;t marked completed or cancelled yet.</T>
                {overdue.map((i) => <InterviewCard key={i.id} i={i} onReschedule={openResched} onCancel={cancel} />)}
              </View>
            ) : null}
            {past.length > 0 ? (
              <View style={{ gap: 10 }}>
                <T s={12.5} w="b" c={C.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Past and cancelled · {past.length}</T>
                {past.map((i) => <InterviewCard key={i.id} i={i} past onReschedule={openResched} onCancel={cancel} />)}
              </View>
            ) : null}
          </View>
        )}
      </PageScroll>

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

export function ReportsScreen() {
  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Reports" sub="Hiring funnel, sources, search and outreach performance." />
        <EmptyState icon={BarChart3} title="Reports aren't connected yet" body="Analytics live here, deliberately away from the search screen. They'll populate from real hiring activity once the reporting endpoints are wired — no placeholder numbers are shown." />
      </PageScroll>
    </Shell>
  )
}
