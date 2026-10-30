import { useEffect, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Avatar, C, Sheet, T } from '../../wk'
import { ErrorBlock, ListSkeleton, StagePill } from '../rc'
import { apiMessage, compareApplicants, STAGE_LABEL } from '../../../services/recruiter'

const Na = () => <T s={12.5} c={C.muted}>Not provided</T>
const CRITERIA = [
  ['communication', 'Communication'],
  ['technical', 'Technical / functional'],
  ['roleFit', 'Role fit'],
  ['problemSolving', 'Problem-solving'],
  ['cultureFit', 'Culture / team fit'],
]
const EXP_TEXT = { within: 'Within the required range', below: 'Below the required range', above: 'Above the required range' }
const COL = 190

const norm = (v) => JSON.stringify(v ?? null)
const differs = (values) => new Set(values.map(norm)).size > 1
const Line = ({ children, c, w, s = 12.5 }) => <T s={s} c={c} w={w}>{children}</T>

// Side-by-side facts for 2–4 candidates of the same job. Everything shown is stored data; rows where the candidates
// actually differ are marked so the eye goes there. There is no overall score or ranking.
export default function CompareSheet({ ids, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!ids) return
    setData(null)
    setError('')
    compareApplicants(ids).then(setData).catch((e) => setError(apiMessage(e, 'Could not load the comparison.')))
  }, [ids])

  const rows = useMemo(() => {
    if (!data) return []
    const it = data.items
    const sharedSkills = it.length ? it[0].skills.filter((s) => it.every((x) => x.skills.some((y) => y.toLowerCase() === s.toLowerCase()))) : []
    const sharedSet = new Set(sharedSkills.map((s) => s.toLowerCase()))
    return [
      {
        label: 'Match vs job requirements',
        diff: differs(it.map((c) => [c.match?.matchedSkills, c.match?.experience, c.match?.location, c.match?.salary])),
        cell: (c) => (
          <View style={{ gap: 3 }}>
            {c.match?.requiredSkills ? <Line><T s={12.5} w="b">{c.match.matchedSkills.length}/{c.match.requiredSkills}</T> skills{c.match.missingSkills.length > 0 ? <T s={12.5} c={C.muted}> · missing {c.match.missingSkills.join(', ')}</T> : null}</Line> : <Line c={C.muted}>No skills listed on the job</Line>}
            {c.match?.experience ? <Line c={c.match.experience === 'within' ? C.ink : C.warn}>{EXP_TEXT[c.match.experience]}</Line> : null}
            {c.match?.location != null ? <Line c={c.match.location ? C.ink : C.warn}>{c.match.location ? 'Location matches' : 'Different location'}</Line> : null}
            {c.match?.salary ? <Line c={c.match.salary === 'within' ? C.ink : C.warn}>{c.match.salary === 'within' ? 'Expectation within budget' : 'Expectation above budget'}</Line> : null}
          </View>
        ),
      },
      {
        label: 'Skills',
        diff: differs(it.map((c) => [...c.skills].map((s) => s.toLowerCase()).sort())),
        cell: (c) => c.skills.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {c.skills.map((s) => {
              const shared = sharedSet.has(s.toLowerCase())
              return <View key={s} style={{ borderRadius: 5, backgroundColor: shared ? C.line2 : C.accentSoft, paddingHorizontal: 6, paddingVertical: 1.5 }}><T s={11.5} w={shared ? 'r' : 's'} c={shared ? C.ink2 : C.accent}>{s}</T></View>
            })}
          </View>
        ) : <Na />,
      },
      { label: 'Experience', diff: differs(it.map((c) => c.experienceYears)), cell: (c) => <Line w="s" s={14}>{c.experienceYears} yrs</Line> },
      {
        label: 'Location',
        diff: differs(it.map((c) => [c.currentLocation, c.preferredLocations])),
        cell: (c) => (
          <View style={{ gap: 2 }}>
            <Line>Current: {c.currentLocation ?? 'Not provided'}</Line>
            <Line>Preferred: {c.preferredLocations ? c.preferredLocations.join(', ') : 'Not provided'}</Line>
            {c.workModePreference ? <Line c={C.muted}>Work mode: {c.workModePreference.join(', ')}</Line> : null}
          </View>
        ),
      },
      {
        label: 'Salary expectation',
        diff: differs(it.map((c) => c.salaryExpectation.lpa)),
        cell: (c) => (c.salaryExpectation.lpa != null ? <Line w="s" s={14}>₹{c.salaryExpectation.lpa}{c.salaryExpectation.maxLpa ? `–${c.salaryExpectation.maxLpa}` : ''} LPA</Line> : c.salaryExpectation.raw ? <Line>{c.salaryExpectation.raw}</Line> : <Na />),
      },
      {
        label: 'Notice / availability',
        diff: differs(it.map((c) => c.noticePeriod.days ?? c.noticePeriod.raw)),
        cell: (c) => c.noticePeriod.raw ? <Line>{c.noticePeriod.raw}{c.noticePeriod.days != null && !/\d|immediate/i.test(c.noticePeriod.raw) ? ` (${c.noticePeriod.days} days)` : ''}</Line> : <Na />,
      },
      {
        label: 'Resume highlights',
        diff: false,
        cell: (c) => (
          <View style={{ gap: 3 }}>
            {c.resume.headline ? <Line w="m">{c.resume.headline}</Line> : null}
            {c.resume.roles.map((r) => <Line key={r} c={C.ink2}>{r}</Line>)}
            {c.resume.education.map((e) => <Line key={e} c={C.muted}>{e}</Line>)}
            <Line c={C.muted}>{c.resume.projects} project{c.resume.projects === 1 ? '' : 's'} · {c.resume.certificates} certificate{c.resume.certificates === 1 ? '' : 's'}{c.resume.resumeVerified ? ' · resume verified' : ''}{c.resume.identityVerified ? ' · ID verified' : ''}</Line>
            {!c.resume.headline && c.resume.roles.length === 0 && c.resume.education.length === 0 ? <Na /> : null}
          </View>
        ),
      },
      {
        label: 'Recruiter notes',
        diff: false,
        cell: (c) => c.notes.length ? <View style={{ gap: 6 }}>{c.notes.map((n, i) => <View key={i}><Line>{n.text}</Line><T s={11} c={C.muted}>{n.byName}</T></View>)}</View> : <Line c={C.muted}>No notes</Line>,
      },
      {
        label: 'Interview scores',
        diff: differs(it.map((c) => c.interview.overall)),
        cell: (c) =>
          c.interview.scorecards === 0 ? (
            <Line c={C.muted}>No scorecards yet</Line>
          ) : (
            <View style={{ gap: 3 }}>
              <Line><T s={15} w="b">{c.interview.overall}</T><T s={12.5} c={C.muted}> / 5 average · {c.interview.scorecards} scorecard{c.interview.scorecards === 1 ? '' : 's'}</T></Line>
              {CRITERIA.map(([k, label]) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T s={12} c={C.muted} style={{ flex: 1 }}>{label}</T>
                  <T s={12} w="s">{c.interview.ratings[k] ?? '—'}</T>
                </View>
              ))}
              <Line c={C.muted}>{c.interview.recommendations.join(', ')}</Line>
            </View>
          ),
      },
    ]
  }, [data])

  return (
    <Sheet open={!!ids} onClose={onClose} title="Compare candidates" subtitle={data?.job ? `${data.job.title} · highlighted rows are where candidates differ` : undefined}>
      {error ? <ErrorBlock message={error} /> : !data ? <ListSkeleton rows={5} /> : (
        <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
          <View>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 10 }}>
              {data.items.map((c) => (
                <View key={c.id} style={{ width: COL, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Avatar candidate={c} size={32} />
                  <View style={{ flex: 1, gap: 2 }}><T s={13.5} w="b" numberOfLines={1}>{c.name}</T><StagePill stage={c.stage} label={STAGE_LABEL[c.stage]} /></View>
                </View>
              ))}
            </View>
            {rows.map((r) => (
              <View key={r.label} style={{ borderBottomWidth: 1, borderBottomColor: C.line2, backgroundColor: r.diff ? C.accentTint : 'transparent', paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <T s={11.5} w="b" c={C.ink2} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{r.label}</T>
                  {r.diff ? <T s={10.5} w="s" c={C.accent}>Differs</T> : null}
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {data.items.map((c) => <View key={c.id} style={{ width: COL, paddingRight: 12 }}>{r.cell(c)}</View>)}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </Sheet>
  )
}
