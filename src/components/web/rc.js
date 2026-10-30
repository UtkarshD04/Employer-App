// Small building blocks shared by the recruiter-console screens (Overview, Applicants, Offers, Team, ...) —
// the website's components/rc.jsx for React Native.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, ScrollView, View } from 'react-native'
import { AlertCircle } from 'lucide-react-native'
import { Btn, C, Press, Skeleton, T, card } from '../wk'

export function ErrorBlock({ message = 'Could not load this.', onRetry }) {
  return (
    <View accessibilityRole="alert" style={{ alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 24 }}>
      <AlertCircle size={22} color={C.bad} />
      <T s={14} w="s" style={{ textAlign: 'center' }}>{message}</T>
      {onRetry ? <Btn size="sm" onPress={onRetry}>Try again</Btn> : null}
    </View>
  )
}

export function ListSkeleton({ rows = 4, h = 56 }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} h={h} r={12} />)}
    </View>
  )
}

export function StatTile({ label, value, hint, onPress, warn }) {
  const body = (
    <View style={[card, { padding: 14, borderRadius: 12, minHeight: 92 }]}>
      <T s={12} w="s" c={C.muted}>{label}</T>
      <CountUp value={value} s={26} w="x" c={warn ? C.warn : C.ink} style={{ marginTop: 4, letterSpacing: -0.5, lineHeight: 30 }} />
      {hint ? <T s={12} c={C.muted} style={{ marginTop: 2 }}>{hint}</T> : null}
    </View>
  )
  return onPress ? <Press onPress={onPress} style={{ width: '48.5%' }}>{body}</Press> : <View style={{ width: '48.5%' }}>{body}</View>
}

// [background, text] per stage — a function so it follows the current palette.
export const stageTone = () => ({
  new: [C.chipBg, C.ink2],
  reviewed: [C.chipBg, C.ink2],
  shortlisted: [C.accentSoft, C.accent],
  interview: [C.blueSoft, C.blueText],
  offer: [C.warnTint, C.warnText],
  hired: [C.okSoft, C.ok],
  rejected: [C.badTint, C.badText],
})
export function StagePill({ stage, label }) {
  const tone = stageTone()
  const [bg, fg] = tone[stage] ?? tone.new
  return <View style={{ alignSelf: 'flex-start', borderRadius: 5, backgroundColor: bg, paddingHorizontal: 6, paddingVertical: 2 }}><T s={11.5} w="s" c={fg}>{label}</T></View>
}

/** Horizontal tab strip — the website's underlined tablist. */
export function Tabs({ tabs, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.line }} contentContainerStyle={{ gap: 4 }}>
      {tabs.map(([k, label]) => {
        const on = k === value
        return (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(k)} style={{ minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: on ? C.accent : 'transparent' }}>
            <T s={13.5} w="b" c={on ? C.accent : C.ink2}>{label}</T>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** A small label above a block, e.g. "Internal tags". */
export function Overline({ children, style }) {
  return <T s={11.5} w="b" c={C.ink2} style={[{ textTransform: 'uppercase', letterSpacing: 0.6 }, style]}>{children}</T>
}

export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Date(d).toLocaleDateString('en-IN', opts) : '—')
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—')
export const ago = (d) => {
  if (!d) return ''
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.round(h / 24)
  return days < 30 ? `${days}d ago` : fmtDate(d)
}

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Pull-to-refresh state for a screen: `reload` may return a promise; the spinner stays until it settles. */
export function useRefresh(reload) {
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await reload()
    } finally {
      setRefreshing(false)
    }
  }, [reload])
  return { refreshing, onRefresh }
}

/** Fades and lifts its children in on mount; `index` staggers a list of them. */
export function FadeIn({ children, index = 0, style }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, delay: Math.min(index, 8) * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [v, index])
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }, style]}>{children}</Animated.View>
}

/** A whole number that counts up to `value` when it first appears or changes. Non-numbers render as they are. */
export function CountUp({ value, ...textProps }) {
  const numeric = typeof value === 'number' && Number.isFinite(value)
  const [shown, setShown] = useState(numeric ? 0 : value)
  useEffect(() => {
    if (!numeric) return setShown(value)
    const v = new Animated.Value(0)
    const id = v.addListener(({ value: n }) => setShown(Math.round(n)))
    Animated.timing(v, { toValue: value, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
    return () => v.removeListener(id)
  }, [value, numeric])
  return <T {...textProps}>{shown ?? '—'}</T>
}
