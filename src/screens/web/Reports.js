import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, Share, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { BarChart3, Download } from 'lucide-react-native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { ErrorBlock, FadeIn, ListSkeleton, useRefresh } from '../../components/web/rc'
import JobInsights from '../../components/web/JobInsights'
import { Btn, C, EmptyState, T, card } from '../../components/wk'
import { useWorkspace } from '../../store/workspace'
import { apiMessage, exportApplicants, getApplicantsSummary, PIPELINE, usePermissions } from '../../services/recruiter'

const bar = () => ({ new: C.dot, reviewed: '#6f8ca3', shortlisted: C.accent2, interview: '#24557f', offer: '#c9a227', hired: C.ok, rejected: '#c98a82' })

// Hiring funnel per job, straight from the stored pipeline. Nothing here is projected.
export default function ReportsScreen() {
  const nav = useNavigation()
  const { toast } = useWorkspace()
  const { can } = usePermissions()
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState('')
  const [jobId, setJobId] = useState('')
  const load = useCallback(() => { setError(''); return getApplicantsSummary().then(setJobs).catch((e) => setError(apiMessage(e, 'Could not load reports.'))) }, [])
  useEffect(() => { load() }, [load])

  const { refreshing, onRefresh } = useRefresh(load)
  const exp = async () => {
    try {
      const csv = await exportApplicants('all')
      await Share.share({ title: 'applicants.csv', message: csv })
    } catch (e) {
      toast(apiMessage(e), { tone: 'warn' })
    }
  }
  return (
    <Shell>
      <PageScroll onRefresh={onRefresh} refreshing={refreshing}>
        <PageTitle title="Reports" sub="Where candidates are in your hiring, job by job." />
        {can('exports.run') ? <Btn size="sm" icon={Download} onPress={exp} style={{ alignSelf: 'flex-start' }}>Export applicants (CSV)</Btn> : null}
        {error ? <ErrorBlock message={error} onRetry={load} /> : !jobs ? <ListSkeleton h={120} /> : jobs.length === 0 ? (
          <EmptyState icon={BarChart3} title="No jobs yet" body="Post a job and its hiring funnel will show up here as candidates move through your pipeline." />
        ) : (
          <View style={{ gap: 12 }}>
            {jobs.map((j, k) => (
              <FadeIn key={j.id} index={k}><View style={[card, { padding: 14, gap: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <T s={14.5} w="b" numberOfLines={1}>{j.title}</T>
                    <T s={12} c={C.muted}>{j.status === 'sourcing' ? 'Live' : j.status.replace(/_/g, ' ')}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}><T s={20} w="x" style={{ lineHeight: 24 }}>{j.total}</T><T s={11} c={C.muted}>total</T></View>
                </View>
                {j.total > 0 ? (
                  <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: C.line2 }} accessibilityLabel="Applicants by stage">
                    {PIPELINE.map((s) => (j.counts[s.key] ? <View key={s.key} style={{ flex: j.counts[s.key], backgroundColor: bar()[s.key] }} /> : null))}
                  </View>
                ) : null}
                {j.total > 0 ? <T s={12} c={C.muted}>{Math.round((((j.counts.shortlisted ?? 0) + (j.counts.interview ?? 0) + (j.counts.offer ?? 0) + (j.counts.hired ?? 0)) / j.total) * 100)}% shortlisted or further · {j.counts.hired ?? 0} hired</T> : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                  {PIPELINE.map((s) => (
                    <View key={s.key} style={{ alignItems: 'center', minWidth: 56 }}>
                      <T s={15} w="b">{j.counts[s.key]}</T>
                      <T s={11.5} c={C.muted}>{s.label}</T>
                    </View>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 18 }}>
                  <Pressable onPress={() => setJobId(j.id === jobId ? '' : j.id)} hitSlop={8}><T s={12.5} w="s" c={C.accent}>{j.id === jobId ? 'Hide insights' : 'Insights'}</T></Pressable>
                  <Pressable onPress={() => nav.navigate('Applicants', { jobId: j.id })} hitSlop={8}><T s={12.5} w="s" c={C.accent}>Pipeline</T></Pressable>
                </View>
                {j.id === jobId ? <JobInsights jobId={jobId} /> : null}
              </View></FadeIn>
            ))}
          </View>
        )}
      </PageScroll>
    </Shell>
  )
}
