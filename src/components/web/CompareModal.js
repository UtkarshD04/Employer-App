import { useEffect, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { X } from 'lucide-react-native'
import { getTalentMany } from '../../services/talent'
import { computeMatch, computeTrust } from '../../lib/talent/engine'
import { agoDays, lpa, years, notice } from '../../lib/tfmt'
import { useWorkspace } from '../../store/workspace'
import { Avatar, Banner, C, IconBtn, MatchBadge, Sheet, StatusPill, T } from '../wk'

// Each row says how to read the value and which direction is "better", so the best cell in a
// row can be highlighted (ties all highlight).
const ROWS = [
  { label: 'AI match', get: (x) => x.match.overall, show: (v) => (v == null ? '—' : `${v}%`), best: 'max' },
  { label: 'Trust score', get: (x) => x.trust.score, show: (v) => `${v}/100`, best: 'max' },
  { label: 'Current role', get: (x) => x.c.designation, show: (v) => v },
  { label: 'Company', get: (x) => x.c.currentCompany, show: (v) => v || '—' },
  { label: 'Experience', get: (x) => x.c.experienceYears, show: years },
  { label: 'Expected salary', get: (x) => x.c.expectedSalaryLPA, show: lpa, best: 'min' },
  { label: 'Notice period', get: (x) => x.c.noticePeriodDays, show: notice, best: 'min' },
  { label: 'Location', get: (x) => x.c.location, show: (v) => v || '—' },
  { label: 'Education', get: (x) => x.c.education[0]?.degree, show: (v) => v || '—' },
  { label: 'Skills', get: (x) => x.c.skills, show: (v) => v.join(', '), skills: true },
  { label: 'Last active', get: (x) => x.c.lastActiveDaysAgo, show: agoDays, best: 'min' },
  { label: 'Identity', get: (x) => x.c.verification.identity, status: true },
  { label: 'Employment', get: (x) => x.c.verification.employment, status: true },
  { label: 'Education verified', get: (x) => x.c.verification.education, status: true },
]
const COL = 170

export default function CompareModal({ open, onClose, criteria, onOpenProfile }) {
  const { compare, toggleCompare, clearCompare } = useWorkspace()
  const [list, setList] = useState([])
  useEffect(() => {
    if (open) getTalentMany(compare).then(setList)
  }, [open, compare])
  const items = useMemo(() => list.filter((c) => compare.includes(c.id)).map((c) => ({ c, match: computeMatch(c, criteria), trust: computeTrust(c) })), [list, compare, criteria])

  return (
    <Sheet open={open} onClose={onClose} title="Compare candidates" subtitle="Best value in each row is highlighted">
      {items.length < 2 ? <Banner style={{ marginBottom: 12 }}>Select at least 2 candidates to compare (up to 5).</Banner> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
        <View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 104 }} />
            {items.map(({ c }) => (
              <View key={c.id} style={{ width: COL, paddingHorizontal: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', gap: 8 }}>
                <Avatar candidate={c} size={34} />
                <View style={{ flex: 1 }}>
                  <T s={13} w="s" numberOfLines={1} onPress={() => { onClose(); onOpenProfile?.(c.id) }}>{c.name}</T>
                  <T s={12} c={C.muted} numberOfLines={1}>{c.location}</T>
                </View>
                <IconBtn icon={X} size={22} onPress={() => toggleCompare(c.id)} label={`Remove ${c.name}`} />
              </View>
            ))}
          </View>
          {ROWS.map((row) => {
            const vals = items.map((x) => row.get(x))
            const nums = vals.filter((v) => typeof v === 'number')
            const target = row.best && nums.length > 1 ? (row.best === 'max' ? Math.max(...nums) : Math.min(...nums)) : null
            const sets = row.skills ? items.map((x) => new Set(x.c.skills.map((s) => s.toLowerCase()))) : []
            const common = sets.length ? sets.reduce((a, b) => new Set([...a].filter((s) => b.has(s)))) : new Set()
            return (
              <View key={row.label} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line2 }}>
                <T s={12} w="m" c={C.muted} style={{ width: 104, paddingVertical: 10, paddingRight: 8 }}>{row.label}</T>
                {items.map((x, i) => {
                  const v = vals[i]
                  const isBest = target != null && v === target
                  return (
                    <View key={x.c.id} style={{ width: COL, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: isBest ? 'rgba(227,245,234,0.6)' : 'transparent' }}>
                      {row.status ? (
                        <StatusPill status={v} />
                      ) : row.skills ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                          {v.map((s) => (
                            <View key={s} style={{ borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: common.has(s.toLowerCase()) ? C.line2 : C.blueSoft }}>
                              <T s={11.5} w={common.has(s.toLowerCase()) ? 'r' : 'm'} c={common.has(s.toLowerCase()) ? C.ink2 : C.blueText}>{s}</T>
                            </View>
                          ))}
                        </View>
                      ) : row.label === 'AI match' && v != null ? (
                        <MatchBadge score={v} />
                      ) : (
                        <T s={13} w={isBest ? 's' : 'r'} c={isBest ? C.okText : C.ink}>{row.show(v)}</T>
                      )}
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>
      </ScrollView>
      <T s={12} c={C.muted} style={{ marginTop: 12 }}>Skills in blue are unique to that candidate; grey skills are shared by everyone compared.</T>
      {items.length > 0 ? <T s={12.5} w="m" c={C.muted} style={{ marginTop: 8 }} onPress={() => { clearCompare(); onClose() }}>Clear comparison</T> : null}
    </Sheet>
  )
}
