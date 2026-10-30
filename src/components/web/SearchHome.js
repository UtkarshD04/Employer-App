import { useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Bookmark, Clock } from 'lucide-react-native'
import { Avatar, C, T, card } from '../wk'
import { getTalentMany, searchTalent } from '../../services/talent'
import { useWorkspace } from '../../store/workspace'
import { agoDate } from '../../lib/tfmt'

/** The last few candidate profiles opened on this device, newest first. */
export function RecentCandidates({ limit = 4 }) {
  const nav = useNavigation()
  const { viewed } = useWorkspace()
  const ids = useMemo(() => Object.entries(viewed).sort((a, b) => new Date(b[1]) - new Date(a[1])).slice(0, limit).map(([id]) => id), [viewed, limit])
  const key = ids.join(',')
  const [rows, setRows] = useState(null)
  useEffect(() => {
    if (!ids.length) return setRows([])
    getTalentMany(ids).then(setRows).catch(() => setRows([]))
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows?.length) return null
  const order = new Map(ids.map((id, i) => [id, i]))
  return (
    <View style={[card, { padding: 14 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Clock size={14} color={C.muted} />
        <T s={13} w="s">Recently viewed</T>
      </View>
      {[...rows].sort((a, b) => order.get(a.id) - order.get(b.id)).map((c, i) => (
        <Pressable key={c.id} onPress={() => nav.navigate('CandidateProfile', { id: c.id })} accessibilityRole="button" style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
          <Avatar candidate={c} size={34} />
          <View style={{ flex: 1 }}>
            <T s={13.5} w="s" numberOfLines={1}>{c.name}</T>
            <T s={12} c={C.muted} numberOfLines={1}>{c.designation || '—'}</T>
          </View>
          <T s={11.5} c={C.muted}>{agoDate(viewed[c.id])}</T>
        </Pressable>
      ))}
    </View>
  )
}

function SavedChip({ s }) {
  const nav = useNavigation()
  const { updateSavedSearch } = useWorkspace()
  const [count, setCount] = useState(null)
  useEffect(() => {
    searchTalent(s.criteria, { pageSize: 1 }).then((r) => setCount(r.total)).catch(() => setCount(null))
  }, [s.criteria])
  const fresh = count != null && s.lastCount != null ? Math.max(0, count - s.lastCount) : 0
  const run = () => {
    if (count != null) updateSavedSearch(s.id, { lastCount: count, lastRunAt: new Date().toISOString() })
    nav.navigate('Search', { criteria: s.criteria, nonce: Date.now() })
  }
  return (
    <Pressable onPress={run} accessibilityRole="button" accessibilityLabel={`${s.name}${fresh ? `, ${fresh} new` : ''}`} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: C.line2 }}>
      <T s={13.5} w="m" numberOfLines={1} style={{ flex: 1 }}>{s.name}</T>
      {count != null ? <T s={12} c={C.muted}>{count.toLocaleString('en-IN')}</T> : null}
      {fresh ? <View style={{ borderRadius: 999, backgroundColor: C.okSoft, paddingHorizontal: 8, paddingVertical: 2 }}><T s={11.5} w="s" c={C.okText}>+{fresh} new</T></View> : null}
    </Pressable>
  )
}

/** Saved searches with a live count and how many matches are new since they were last run. */
export function SavedSearchStrip({ limit = 3 }) {
  const nav = useNavigation()
  const { saved } = useWorkspace()
  if (!saved.length) return null
  return (
    <View style={[card, { padding: 14, paddingBottom: 4 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Bookmark size={14} color={C.muted} />
          <T s={13} w="s">Saved searches</T>
        </View>
        {saved.length > limit ? <Pressable onPress={() => nav.navigate('SavedSearches')} hitSlop={8}><T s={12} w="s" c={C.accent}>All {saved.length}</T></Pressable> : null}
      </View>
      {saved.slice(0, limit).map((s) => <SavedChip key={s.id} s={s} />)}
    </View>
  )
}
