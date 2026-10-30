import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { C, SectionCard, T } from '../wk'
import { ErrorBlock, ListSkeleton, Overline, fmtDate } from './rc'
import { apiMessage, getJobInsights } from '../../services/recruiter'

function Metric({ label, value, sub }) {
  return (
    <View style={{ width: '47%' }}>
      <T s={11.5} w="s" c={C.muted}>{label}</T>
      <T s={22} w="x" style={{ letterSpacing: -0.4, lineHeight: 28 }}>{value ?? '—'}</T>
      {sub ? <T s={11.5} c={C.muted}>{sub}</T> : null}
    </View>
  )
}

const conv = (c) => (c.percent == null ? { value: '—', sub: 'Not enough data yet' } : { value: `${c.percent}%`, sub: `${c.numerator} of ${c.denominator}` })

// Only stored figures. A number that cannot be known (no views tracked, no moves recorded) is shown as "—" with the reason.
export default function JobInsights({ jobId }) {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    setD(null)
    setError('')
    getJobInsights(jobId).then(setD).catch((e) => setError(apiMessage(e, 'Could not load insights.')))
  }, [jobId])
  if (error) return <ErrorBlock message={error} />
  if (!d) return <ListSkeleton rows={2} />
  const ic = conv(d.interviewConversion)
  const oc = conv(d.offerConversion)
  const maxDays = Math.max(1, ...d.timeInStage.map((t) => t.avgDays ?? 0))
  const staged = d.timeInStage.filter((t) => !['hired', 'rejected'].includes(t.stage))
  return (
    <SectionCard title="Job insights">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 14 }}>
        <Metric label="Page views" value={d.views.count} sub={d.views.since ? `Counted since ${fmtDate(d.views.since)}` : 'Not tracked yet'} />
        <Metric label="Applications" value={d.applications} />
        <Metric label="Qualified" value={d.qualified.count} sub={d.qualified.count == null ? 'Needs skills on the job' : 'Meets skills + experience'} />
        <Metric label="Shortlisted" value={d.shortlisted} />
        <Metric label="Interview conversion" value={ic.value} sub={ic.sub} />
        <Metric label="Offer conversion" value={oc.value} sub={oc.sub} />
      </View>
      <View style={{ marginTop: 20, gap: 8 }}>
        <Overline>Average time in each stage</Overline>
        {staged.map((t) => (
          <View key={t.stage} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T s={12.5} c={C.ink2} style={{ width: 78 }}>{t.label}</T>
            <View style={{ flex: 1, height: 8, borderRadius: 2, backgroundColor: C.line2 }}>
              {t.avgDays != null ? <View style={{ height: 8, borderRadius: 2, backgroundColor: C.accent, width: `${Math.max(3, (t.avgDays / maxDays) * 100)}%` }} /> : null}
            </View>
            <T s={12} c={C.muted} style={{ width: 84, textAlign: 'right' }}>{t.avgDays != null ? `${t.avgDays} d · n=${t.samples}` : 'no data'}</T>
          </View>
        ))}
        <T s={11.5} c={C.muted}>From recorded stage moves only; earlier moves weren’t timed.</T>
      </View>
      <View style={{ marginTop: 20, gap: 6 }}>
        <Overline>Where applicants came from</Overline>
        {d.sources.length === 0 ? <T s={12.5} c={C.muted}>No applicants yet.</T> : d.sources.map((s) => (
          <View key={s.source} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T s={13}>{s.source}</T><T s={13} w="s">{s.count}</T></View>
        ))}
      </View>
    </SectionCard>
  )
}
