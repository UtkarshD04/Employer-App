import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, View } from 'react-native'
import { BarChart3, CalendarDays, MessageSquare, Sparkles, Video } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { PickerField } from '../../components/web/ActionModals'
import { AI_PROMPTS } from '../../components/web/AskAI'
import { Btn, C, EmptyState, Field, Sheet, Skeleton, T, card } from '../../components/wk'
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

const tone = { Confirmed: [C.okSoft, C.okText], 'Awaiting confirmation': [C.warnSoft, C.warn], Rescheduled: ['#f1eefc', '#6d4fc7'], Completed: [C.blueSoft, '#1f6fb2'], Cancelled: [C.line2, C.muted] }

export function InterviewsScreen() {
  const qc = useQueryClient()
  const { toast } = useWorkspace()
  const q = useQuery({ queryKey: queryKeys.interviews, queryFn: listInterviews })
  const [resched, setResched] = useState(null)
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [busy, setBusy] = useState(false)
  const interviews = q.data ?? []

  const openResched = (i) => {
    const d = new Date(i.startsAt)
    setDate(d)
    setTime(d)
    setResched(i)
  }
  const confirmResched = async () => {
    const d = new Date(date)
    d.setHours(time.getHours(), time.getMinutes(), 0, 0)
    setBusy(true)
    try {
      await rescheduleInterview(resched.id, { startsAt: d.toISOString() })
      toast('Interview rescheduled — the candidate is notified')
      setResched(null)
      qc.invalidateQueries({ queryKey: queryKeys.interviews })
    } catch (e) {
      toast(errorMessage(e), { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }
  const cancel = (i) =>
    Alert.alert('Cancel this interview?', 'The candidate will be notified.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel interview',
        style: 'destructive',
        onPress: () => cancelInterview(i.id).then(() => { toast('Interview cancelled'); qc.invalidateQueries({ queryKey: queryKeys.interviews }) }).catch((e) => toast(errorMessage(e), { tone: 'warn' })),
      },
    ])

  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Interviews" sub="Interviews you've planned from candidate profiles." />
        {q.isLoading ? (
          <View style={{ gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={72} r={16} />)}</View>
        ) : q.isError ? (
          <EmptyState icon={CalendarDays} title="Couldn't load interviews" action={<Btn onPress={() => q.refetch()}>Retry</Btn>} />
        ) : interviews.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No interviews planned" body="Open a candidate and choose Schedule interview." />
        ) : (
          <View style={{ gap: 8 }}>
            {interviews.map((i) => {
              const d = new Date(i.startsAt)
              const [bg, fg] = tone[i.status] ?? [C.blueSoft, '#1f6fb2']
              const active = !['Cancelled', 'Completed'].includes(i.status)
              return (
                <View key={i.id} style={[card, { padding: 16, gap: 10 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <T s={14} w="s">{i.candidateName}</T>
                      <T s={13} c={C.muted}>{i.round || i.mode} · {d.toLocaleDateString('en-IN')} at {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}{(i.panel ?? []).length ? ` · ${i.panel.join(', ')}` : ''}</T>
                    </View>
                    <View style={{ alignSelf: 'flex-start', borderRadius: 6, backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2 }}><T s={12} w="m" c={fg}>{i.status ?? 'Planned'}</T></View>
                  </View>
                  {i.meetingLink ? (
                    <Btn size="sm" icon={Video} onPress={() => Linking.openURL(i.meetingLink)} style={{ alignSelf: 'flex-start' }} textStyle={{ color: C.blue }}>Join link</Btn>
                  ) : null}
                  {active ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Btn size="sm" onPress={() => openResched(i)}>Reschedule</Btn>
                      <Btn size="sm" variant="ghost" onPress={() => cancel(i)} textStyle={{ color: C.bad }}>Cancel</Btn>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        )}
      </PageScroll>

      <Sheet open={!!resched} onClose={() => setResched(null)} title="Reschedule interview" subtitle={resched?.candidateName} footer={<><Btn onPress={() => setResched(null)}>Cancel</Btn><Btn variant="primary" loading={busy} onPress={confirmResched}>Confirm new time</Btn></>}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="Date" style={{ flex: 1 }}><PickerField mode="date" value={date} onChange={setDate} minimumDate={new Date()} placeholder="Pick a date" /></Field>
          <Field label="Time" style={{ flex: 1 }}><PickerField mode="time" value={time} onChange={setTime} placeholder="Pick a time" /></Field>
        </View>
        <T s={12} c={C.muted} style={{ marginTop: 12 }}>The candidate is notified of the new time.</T>
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
