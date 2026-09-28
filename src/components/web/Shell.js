import { useEffect, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AlertTriangle, Bell, Check, CreditCard, HelpCircle, LogOut, Menu, Search, Settings as Cog, X } from 'lucide-react-native'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { ROUTES } from '../../lib/routes'
import { getPlanSnapshot, refreshPlan, subscribePlan } from '../../services/plan'
import { listNotifications } from '../../services/notificationsService'
import { queryKeys } from '../../lib/queryClient'
import { useWorkspace } from '../../store/workspace'
import { C, F, Press, T, shadowPop } from '../wk'
import { Alert } from 'react-native'

// The source PNG has wide transparent margins, so it is cropped to the mark itself.
export function Logo({ height = 34 }) {
  const imgH = height * 2.5
  const imgW = imgH * 1.83
  return (
    <View style={{ width: height * 3.22, height, overflow: 'hidden' }}>
      <Image source={require('../../../assets/logo.png')} style={{ position: 'absolute', height: imgH, width: imgW, left: -imgW * 0.17, top: -imgH * 0.303 }} resizeMode="stretch" />
    </View>
  )
}

const PRIMARY = ROUTES.filter((r) => r.nav === 'primary')
const MORE = ROUTES.filter((r) => r.nav === 'more')

function useSectionNav() {
  const nav = useNavigation()
  return (name) => nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }))
}

export function useSignOut() {
  const { logout } = useAuth()
  return () => Alert.alert('Sign out of Mzobs Talent?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])
}

/** Bell: goes to Notifications and shows the unread count from the API. */
function BellLink({ active }) {
  const nav = useNavigation()
  const q = useQuery({ queryKey: queryKeys.notifications, queryFn: listNotifications, refetchInterval: 60_000 })
  const unread = (q.data ?? []).filter((n) => n.unread).length
  return (
    <Press onPress={() => nav.navigate('Notifications')} accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'} scale={0.92} style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? C.accentSoft : 'transparent' }}>
      <Bell size={17} color={active ? C.accent : C.ink2} />
      {unread > 0 ? (
        <View style={{ position: 'absolute', right: 3, top: 3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <T s={9.5} w="b" c="#fff" style={{ lineHeight: 12 }}>{unread > 9 ? '9+' : unread}</T>
        </View>
      ) : null}
    </Press>
  )
}

function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const { user, company } = useAuth()
  const signOut = useSignOut()
  const initials = user?.initials ?? (user?.name ?? 'R').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const go = (name) => { setOpen(false); nav.navigate(name) }
  const item = (Icon, label, onPress, color = C.ink) => (
    <Pressable key={label} onPress={onPress} accessibilityRole="menuitem" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 8 }}>
      <Icon size={14} color={color === C.ink ? C.muted : color} />
      <T s={13} c={color}>{label}</T>
    </Pressable>
  )
  return (
    <>
      <Press onPress={() => setOpen(true)} accessibilityLabel="Account menu" scale={0.92}>
        <LinearGradient colors={['#123a4f', '#0e2237']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <T s={12} w="s" c="#fff">{initials}</T>
        </LinearGradient>
      </Press>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={[{ position: 'absolute', right: 12, top: insets.top + 60, width: 232, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', padding: 4 }, shadowPop]}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: C.line2, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
              <T s={13} w="s" numberOfLines={1}>{user?.name ?? 'Recruiter'}</T>
              <T s={12} c={C.muted} numberOfLines={1}>{user?.email ?? company?.name}</T>
            </View>
            {item(Cog, 'Recruiter settings', () => go('Settings'))}
            {item(CreditCard, 'Plan & credits', () => go('PlanCredits'))}
            {item(HelpCircle, 'Help & support', () => go('Help'))}
            {item(LogOut, 'Sign out', () => { setOpen(false); signOut() }, C.bad)}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

export function TopNav() {
  const insets = useSafeAreaInsets()
  const route = useRoute()
  const nav = useNavigation()
  const section = useSectionNav()
  const signOut = useSignOut()
  const [menu, setMenu] = useState(false)
  useEffect(() => { refreshPlan() }, [])
  const goTo = (name) => {
    setMenu(false)
    if (name !== route.name) section(name)
  }
  return (
    <View style={{ backgroundColor: 'rgba(246,248,251,0.96)', borderBottomWidth: 1, borderBottomColor: 'rgba(14,34,55,0.1)', paddingTop: insets.top, zIndex: 40 }}>
      <View style={{ height: 64, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
        <Press onPress={() => setMenu((v) => !v)} accessibilityLabel="Menu" scale={0.92} style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
          {menu ? <X size={18} color={C.ink} /> : <Menu size={18} color={C.ink} />}
        </Press>
        <Pressable onPress={() => goTo('Search')} accessibilityLabel="Mzobs Talent — home" style={{ marginLeft: 4 }}>
          <Logo />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Press onPress={() => goTo('Search')} accessibilityLabel="Search candidates" scale={0.92} style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Search size={17} color={C.ink2} />
        </Press>
        <BellLink active={route.name === 'Notifications'} />
        <ProfileMenu />
        <Press onPress={signOut} accessibilityLabel="Log out" scale={0.92} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(14,34,55,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={15} color={C.ink} />
        </Press>
      </View>
      {menu ? (
        <View style={{ borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#fff', padding: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {[...PRIMARY, ...MORE].map((r) => {
              const on = r.name === route.name
              return (
                <Pressable key={r.name} onPress={() => goTo(r.name)} style={{ width: '49%', minHeight: 44, justifyContent: 'center', borderRadius: 8, paddingHorizontal: 10, backgroundColor: on ? C.accentSoft : 'transparent' }}>
                  <T s={13.5} w="b" c={on ? C.accent : 'rgba(14,34,55,0.75)'}>{r.label}</T>
                </Pressable>
              )
            })}
          </View>
          <Pressable onPress={() => { setMenu(false); signOut() }} style={{ marginTop: 8, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, borderWidth: 1, borderColor: C.line }}>
            <LogOut size={15} color="#c0392b" />
            <T s={13.5} w="b" c="#c0392b">Log out</T>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

/** Every recruiter screen: the top nav, then the page. */
export function Shell({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopNav />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}

/** Title block used by the simple pages ("Jobs", "Shortlists"…). */
export function PageTitle({ title, sub, accent, size = 30 }) {
  return (
    <View>
      <T s={size} w="x" style={{ letterSpacing: -0.9, lineHeight: Math.round(size * 1.15) }}>
        {title}{accent ? <T s={size} w="s" c={C.accent} style={{ fontFamily: F.i, fontStyle: 'italic' }}> {accent}</T> : null}
      </T>
      {sub ? <T s={14} c={C.muted} style={{ marginTop: 4 }}>{sub}</T> : null}
    </View>
  )
}

export function PageScroll({ children, contentStyle, onRefresh, refreshing }) {
  return (
    <ScrollView contentContainerStyle={[{ padding: 16, paddingTop: 24, paddingBottom: 120, gap: 20 }, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  )
}

export function ToastStack() {
  const { toasts, dismissToast } = useWorkspace()
  const insets = useSafeAreaInsets()
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 64, alignItems: 'center', gap: 8, zIndex: 100 }}>
      {toasts.map((t) => (
        <View key={t.id} style={[{ maxWidth: '92%', flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: C.ink, paddingHorizontal: 16, paddingVertical: 10 }, shadowPop]}>
          {t.tone === 'warn' ? <AlertTriangle size={15} color="#fbbf24" /> : <Check size={15} color="#4ade80" />}
          <T s={13} c="#fff" style={{ flexShrink: 1 }}>{t.message}</T>
          {t.action ? <Pressable onPress={() => { t.action.run(); dismissToast(t.id) }} hitSlop={8}><T s={13} w="s" c="#a5b4fc">{t.action.label}</T></Pressable> : null}
        </View>
      ))}
    </View>
  )
}
