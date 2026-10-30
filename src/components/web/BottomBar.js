import { useEffect, useState } from 'react'
import { Keyboard, Pressable, View } from 'react-native'
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CalendarDays, LayoutDashboard, MoreHorizontal, Search, Users } from 'lucide-react-native'
import { ROUTES } from '../../lib/routes'
import { useQuery } from '@tanstack/react-query'
import { getApplicantsSummary, usePermissions } from '../../services/recruiter'
import { tap } from '../../lib/haptics'
import { C, Sheet, T } from '../wk'

// The four places recruiters go all day, one tap away; everything else sits behind "More".
const TABS = [
  { name: 'Search', label: 'Search', icon: Search },
  { name: 'Applicants', label: 'Applicants', icon: Users },
  { name: 'Interviews', label: 'Interviews', icon: CalendarDays },
  { name: 'Overview', label: 'Overview', icon: LayoutDashboard },
]

export default function BottomBar() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const route = useRoute()
  const { loaded, can } = usePermissions()
  const [more, setMore] = useState(false)
  // Applicants still waiting for a first look, summed across jobs; refreshes at most once a minute.
  const summary = useQuery({ queryKey: ['applicants', 'summary'], queryFn: getApplicantsSummary, staleTime: 60_000, enabled: !loaded || can('candidates.view') })
  const fresh = (summary.data ?? []).reduce((n, j) => n + (j.counts?.new ?? 0), 0)
  const [typing, setTyping] = useState(false)
  // The bar would ride up above the keyboard and cover the field being typed in.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setTyping(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setTyping(false))
    return () => { show.remove(); hide.remove() }
  }, [])
  const allowed = (r) => !loaded || !r.perm || r.perm.some(can)
  const tabNames = new Set(TABS.map((t) => t.name))
  const rest = ROUTES.filter((r) => r.nav && !tabNames.has(r.name) && allowed(r))
  const go = (name) => {
    setMore(false)
    if (name === route.name) return
    tap()
    // Sections replace each other (no back stack between them), like the top menu does.
    nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }))
  }
  const inMore = !tabNames.has(route.name)
  const item = (key, label, Icon, on, onPress, badge) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={badge ? `${label}, ${badge} new` : label} style={{ flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <View>
        <Icon size={20} color={on ? C.accent : C.muted} strokeWidth={on ? 2.4 : 2} />
        {badge ? <View style={{ position: 'absolute', top: -5, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.bad, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}><T s={9.5} w="b" c="#fff" style={{ lineHeight: 12 }}>{badge > 99 ? '99+' : badge}</T></View> : null}
      </View>
      <T s={10.5} w={on ? 'b' : 'm'} c={on ? C.accent : C.muted}>{label}</T>
    </Pressable>
  )
  return (
    <>
      <View style={{ display: typing ? 'none' : 'flex', flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line, paddingBottom: insets.bottom }}>
        {TABS.filter(allowed).map((t) => item(t.name, t.label, t.icon, route.name === t.name, () => go(t.name), t.name === 'Applicants' ? fresh : 0))}
        {item('more', 'More', MoreHorizontal, inMore || more, () => setMore(true))}
      </View>
      <Sheet open={more} onClose={() => setMore(false)} title="More">
        {rest.map((r) => (
          <Pressable key={r.name} onPress={() => go(r.name)} style={{ minHeight: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: C.line2 }}>
            <T s={14.5} w={r.name === route.name ? 'b' : 'm'} c={r.name === route.name ? C.accent : C.ink}>{r.label}</T>
          </Pressable>
        ))}
      </Sheet>
    </>
  )
}
