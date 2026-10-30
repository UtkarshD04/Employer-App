import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CalendarDays, LayoutDashboard, MoreHorizontal, Search, Users } from 'lucide-react-native'
import { ROUTES } from '../../lib/routes'
import { usePermissions } from '../../services/recruiter'
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
  const item = (key, label, Icon, on, onPress) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Icon size={20} color={on ? C.accent : C.muted} strokeWidth={on ? 2.4 : 2} />
      <T s={10.5} w={on ? 'b' : 'm'} c={on ? C.accent : C.muted}>{label}</T>
    </Pressable>
  )
  return (
    <>
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line, paddingBottom: insets.bottom }}>
        {TABS.filter(allowed).map((t) => item(t.name, t.label, t.icon, route.name === t.name, () => go(t.name)))}
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
