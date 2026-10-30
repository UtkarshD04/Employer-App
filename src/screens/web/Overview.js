import { useCallback, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { ArrowRight, CalendarClock, CalendarPlus, CheckCircle2, Plus, Search, Users } from 'lucide-react-native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { ErrorBlock, FadeIn, ListSkeleton, StatTile, ago, fmtDateTime, useRefresh } from '../../components/web/rc'
import { Banner, Btn, C, SectionCard, T } from '../../components/wk'
import { apiMessage, getApplicantsSummary, getOverview, PIPELINE } from '../../services/recruiter'
import { openHref } from '../../lib/navigation'
import { useAuth } from '../../context/AuthContext'

// "Good morning, Asha" — first name only, by the phone's local time.
function greeting(name) {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const first = String(name ?? '').trim().split(/\s+/)[0]
  return first ? `${part}, ${first}` : 'Overview'
}

// "Today", "Tomorrow" or the date — by calendar day.
function dayLabel(iso) {
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((day(new Date(iso)) - day(new Date())) / 86400000)
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : null
}

const severityColor = (s) => ({ high: C.bad, medium: C.warn, low: C.muted })[s] ?? C.muted
const HEALTH_LABEL = { low_applications: 'Low applications', expiring: 'Closing soon', deadline_passed: 'Deadline passed', no_shortlist: 'No shortlist', feedback_pending: 'Feedback pending' }

function Dot({ severity, top }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: top, backgroundColor: severityColor(severity) }} />
}

export default function OverviewScreen() {
  const nav = useNavigation()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [funnel, setFunnel] = useState(null)
  const load = useCallback(() => {
    setError('')
    return getOverview().then(setData).catch((e) => setError(apiMessage(e, 'Could not load your overview.')))
  }, [])
  useEffect(() => { load() }, [load])
  // The pipeline totals across every job, summed from the per-job counts.
  useEffect(() => {
    getApplicantsSummary()
      .then((jobs) => setFunnel(PIPELINE.map((st) => ({ ...st, count: jobs.reduce((n, j) => n + (j.counts?.[st.key] ?? 0), 0) }))))
      .catch(() => setFunnel(null))
  }, [data])
  // Coming back to the tab after acting on something should show fresh counts.
  useEffect(() => nav.addListener('focus', () => data && load()), [nav, load, data])

  const { refreshing, onRefresh } = useRefresh(load)

  if (error) return <Shell><PageScroll><PageTitle title="Overview" /><ErrorBlock message={error} onRetry={load} /></PageScroll></Shell>
  if (!data) return <Shell><PageScroll><PageTitle title="Overview" /><ListSkeleton rows={5} /></PageScroll></Shell>

  const s = data.stats
  const limited = data.scope === 'limited'
  return (
    <Shell>
      <PageScroll onRefresh={onRefresh} refreshing={refreshing}>
        <PageTitle title={greeting(user?.name)} sub={limited ? 'Your interviews and feedback.' : 'What needs doing today across your hiring.'} />
        {!limited ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Btn variant="primary" size="sm" icon={Plus} onPress={() => nav.navigate('JobForm')}>Post a job</Btn>
            <Btn size="sm" icon={Search} onPress={() => nav.navigate('Search')}>Search talent</Btn>
            <Btn size="sm" icon={Users} onPress={() => nav.navigate('Applicants')}>Applicants</Btn>
            <Btn size="sm" icon={CalendarPlus} onPress={() => nav.navigate('Interviews')}>Interviews</Btn>
          </View>
        ) : null}

        {s.creditsRemaining != null && s.creditsRemaining <= 3 ? (
          <Pressable onPress={() => nav.navigate('PlanCredits')}>
            <Banner tone={s.creditsRemaining === 0 ? 'bad' : 'warn'}>
              {s.creditsRemaining === 0 ? 'You are out of CV credits. Tap to add more.' : `Only ${s.creditsRemaining} CV credit${s.creditsRemaining === 1 ? '' : 's'} left. Tap to top up.`}
            </Banner>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
          {!limited ? <StatTile label="Active jobs" value={s.activeJobs} onPress={() => nav.navigate('Jobs')} /> : null}
          {!limited ? <StatTile label="New applicants" value={s.newApplicants} hint="Awaiting review" warn={!!s.newApplicants} onPress={() => nav.navigate('Applicants', { stage: 'new' })} /> : null}
          <StatTile label="Interviews today" value={s.interviewsToday} hint={`${s.interviewsWeek} this week`} onPress={() => nav.navigate('Interviews')} />
          {s.feedbackPending != null ? <StatTile label="Feedback pending" value={s.feedbackPending} warn={!!s.feedbackPending} onPress={() => nav.navigate('Interviews', { filter: 'feedback' })} /> : null}
          {!limited ? <StatTile label="Offers awaiting" value={s.offersAwaiting} onPress={() => nav.navigate('Offers')} /> : null}
          {s.creditsRemaining != null ? <StatTile label="CV credits left" value={s.creditsRemaining} warn={s.creditsRemaining === 0} onPress={() => nav.navigate('PlanCredits')} /> : null}
        </View>

        <FadeIn index={0}>
          <SectionCard title="Needs your attention" style={{ paddingBottom: 0 }}>
            {data.attention.length === 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                <CheckCircle2 size={16} color={C.ok} />
                <T s={13.5} c={C.muted}>Nothing needs your attention right now.</T>
              </View>
            ) : (
              data.attention.map((a, i) => (
                <Pressable key={a.id} onPress={() => openHref(nav, a.href)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
                  <Dot severity={a.severity} />
                  <T s={14} w="m" style={{ flex: 1 }}>{a.text}</T>
                  <ArrowRight size={15} color={C.muted} />
                </Pressable>
              ))
            )}
          </SectionCard>
        </FadeIn>

        {!limited && funnel && funnel.some((f) => f.count > 0) ? (
          <SectionCard title="Hiring funnel">
            {funnel.map((f) => {
              const max = Math.max(1, ...funnel.map((x) => x.count))
              return (
                <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                  <T s={12.5} c={C.ink2} style={{ width: 78 }}>{f.label}</T>
                  <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.line2 }}>
                    {f.count > 0 ? <View style={{ height: 8, borderRadius: 4, backgroundColor: f.key === 'rejected' ? '#c98a82' : C.accent, width: `${Math.max(4, (f.count / max) * 100)}%` }} /> : null}
                  </View>
                  <T s={12.5} w="s" style={{ width: 34, textAlign: 'right' }}>{f.count}</T>
                </View>
              )
            })}
          </SectionCard>
        ) : null}

        {!limited ? (
          <SectionCard title="Job health">
            {data.jobHealth.length === 0 ? (
              <T s={13.5} c={C.muted}>No issues found on your live jobs.</T>
            ) : (
              data.jobHealth.map((h, i) => (
                <Pressable key={`${h.jobId}-${h.type}-${i}`} onPress={() => nav.navigate('Applicants', { jobId: h.jobId })} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
                  <Dot severity={h.severity} top={6} />
                  <View style={{ flex: 1 }}>
                    <T s={13.5} w="s" numberOfLines={1}>{h.jobTitle}</T>
                    <T s={12.5} c={C.muted}>{HEALTH_LABEL[h.type]}: {h.message}</T>
                  </View>
                </Pressable>
              ))
            )}
          </SectionCard>
        ) : null}

        {data.upcoming?.length > 0 ? (
          <SectionCard title="Upcoming interviews" action={<Pressable onPress={() => nav.navigate('Interviews')} hitSlop={8}><T s={12.5} w="s" c={C.accent}>All</T></Pressable>}>
            {data.upcoming.map((i, k) => (
              <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: k ? 1 : 0, borderTopColor: C.line2 }}>
                <CalendarClock size={15} color={C.muted} />
                <View style={{ flex: 1 }}>
                  <T s={13.5} w="s" numberOfLines={1}>{i.candidateName}</T>
                  <T s={12.5} c={C.muted} numberOfLines={1}>{i.role} · {dayLabel(i.startsAt) ? `${dayLabel(i.startsAt)}, ${new Date(i.startsAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}` : fmtDateTime(i.startsAt)}</T>
                </View>
              </View>
            ))}
          </SectionCard>
        ) : null}

        <FadeIn index={1}>
          <SectionCard title="Recent activity">
            {data.activity.length === 0 ? (
              <T s={13.5} c={C.muted}>Activity appears here as your team moves candidates, schedules interviews and sends offers.</T>
            ) : (
              <View style={{ marginLeft: 4, borderLeftWidth: 1, borderLeftColor: C.line }}>
                {data.activity.map((a) => (
                  <View key={a.id} style={{ paddingVertical: 6, paddingLeft: 14 }}>
                    <View style={{ position: 'absolute', left: -3.5, top: 14, width: 6, height: 6, borderRadius: 3, backgroundColor: C.dot }} />
                    <T s={13}>{a.text}</T>
                    <T s={11.5} c={C.muted}>{[a.actor, ago(a.at)].filter(Boolean).join(' · ')}</T>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        </FadeIn>
      </PageScroll>
    </Shell>
  )
}
