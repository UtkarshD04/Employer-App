import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { initialsOf } from '../lib/format'
import { matchTone } from '../lib/match'

// ─── Type ───────────────────────────────────────────────────────────────────────────────
export function Text({ variant = 'body', color, style, ...props }) {
  const { colors, fontFamily } = useTheme()
  const variants = {
    display: { fontFamily: fontFamily.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4, color: colors.ink },
    title: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3, color: colors.ink },
    section: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.15, color: colors.ink },
    heading: { fontFamily: fontFamily.semibold, fontSize: 15.5, lineHeight: 21, color: colors.ink },
    body: { fontFamily: fontFamily.regular, fontSize: 14.5, color: colors.ink, lineHeight: 21 },
    label: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.inkSecondary },
    caption: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 17, color: colors.inkSecondary },
  }
  return <RNText {...props} style={[variants[variant], color && { color: colors[color] ?? color }, style]} />
}

export const shadowFor = (colors, level = 1) => ({
  shadowColor: colors.shadow,
  shadowOpacity: level === 2 ? 0.1 : 0.05,
  shadowRadius: level === 2 ? 16 : 8,
  shadowOffset: { width: 0, height: level === 2 ? 6 : 2 },
  elevation: level === 2 ? 4 : 1,
})

// ─── Motion primitives ──────────────────────────────────────────────────────────────────
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// Pressable with a fast spring-scale press. Every tappable surface in the app goes through this.
export function Press({ onPress, style, children, scale = 0.97, disabled, ...rest }) {
  const v = useRef(new Animated.Value(1)).current
  const to = (t) => Animated.spring(v, { toValue: t, useNativeDriver: true, speed: 80, bounciness: 0 }).start()
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(scale)}
      onPressOut={() => to(1)}
      style={[style, { transform: [{ scale: v }] }]}
    >
      {children}
    </AnimatedPressable>
  )
}

// Fades + lifts its children in once on mount; `delay` staggers siblings.
export function FadeIn({ children, delay = 0, style }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [v, delay])
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>
}

// ─── Layout ─────────────────────────────────────────────────────────────────────────────
// Scrollable page body with pull-to-refresh. Screens that need a FlatList render their own.
export function Screen({ children, onRefresh, refreshing = false, contentStyle, footer }) {
  const { colors, spacing } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} colors={[colors.navy]} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer}
    </View>
  )
}

export function Card({ children, style, onPress, flat }) {
  const { colors, radius, spacing } = useTheme()
  const base = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...(flat ? null : shadowFor(colors)),
  }
  if (onPress)
    return (
      <Press onPress={onPress} scale={0.985} style={[base, style]}>
        {children}
      </Press>
    )
  return <View style={[base, style]}>{children}</View>
}

// Fixed bar above the keyboard/home indicator for one-handed primary actions.
export function StickyBar({ children }) {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      {children}
    </View>
  )
}

// ─── Controls ───────────────────────────────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style, size = 'md' }) {
  const { colors, radius, fontFamily } = useTheme()
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    accent: { bg: colors.accentFill, fg: '#FFFFFF', border: colors.accentFill },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.borderStrong },
    soft: { bg: colors.navyTint, fg: colors.navy, border: colors.navyTint },
    danger: { bg: colors.redTint, fg: colors.red, border: colors.redTint },
    ghost: { bg: 'transparent', fg: colors.navy, border: 'transparent' },
  }[variant]
  const off = disabled || loading
  return (
    <Press
      onPress={onPress}
      disabled={off}
      style={[
        {
          minHeight: size === 'sm' ? 44 : 50,
          borderRadius: radius.md + 2,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 18,
          opacity: off ? 0.5 : 1,
          ...((variant === 'primary' || variant === 'accent') && !off ? { shadowColor: palette.bg, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 } : null),
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={palette.fg} /> : icon ? <Feather name={icon} size={16} color={palette.fg} /> : null}
      <RNText style={{ color: palette.fg, fontFamily: fontFamily.semibold, fontSize: 15 }}>{title}</RNText>
    </Press>
  )
}

export function TextField({ label, error, multiline, style, inputStyle, onFocus, onBlur, ...props }) {
  const { colors, radius, fontFamily } = useTheme()
  const [focused, setFocused] = useState(false)
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.inkTertiary}
        selectionColor={colors.navy}
        multiline={multiline}
        {...props}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        style={[
          {
            minHeight: 50,
            borderWidth: focused ? 1.5 : 1,
            borderColor: error ? colors.red : focused ? colors.navy : colors.borderStrong,
            borderRadius: radius.md + 2,
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: fontFamily.regular,
            fontSize: 15,
            color: colors.ink,
          },
          multiline && { minHeight: 120, textAlignVertical: 'top' },
          inputStyle,
        ]}
      />
      {error ? <Text variant="caption" color="red">{error}</Text> : null}
    </View>
  )
}

// Rounded search input with optional filter button (with an active-count dot).
export function SearchBar({ value, onChangeText, onSubmit, placeholder, onFilter, filterCount = 0, style }) {
  const { colors, radius, fontFamily } = useTheme()
  return (
    <View style={[{ flexDirection: 'row', gap: 10, alignItems: 'center' }, style]}>
      <View
        style={{
          flex: 1,
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Feather name="search" size={17} color={colors.inkTertiary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          placeholder={placeholder}
          placeholderTextColor={colors.inkTertiary}
          selectionColor={colors.navy}
          style={{ flex: 1, fontFamily: fontFamily.regular, fontSize: 15, color: colors.ink, paddingVertical: 10 }}
        />
        {value ? (
          <Pressable
            hitSlop={12}
            onPress={() => {
              onChangeText('')
              onSubmit?.('')
            }}
          >
            <Ionicons name="close-circle" size={18} color={colors.inkTertiary} />
          </Pressable>
        ) : null}
      </View>
      {onFilter ? (
        <Press
          onPress={onFilter}
          accessibilityLabel="Filters"
          style={{ width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: filterCount ? colors.navyTint : colors.surface, borderWidth: 1, borderColor: filterCount ? colors.navyTintStrong : colors.border }}
        >
          <Feather name="sliders" size={18} color={filterCount ? colors.navy : colors.ink} />
          {filterCount ? (
            <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <RNText style={{ color: colors.onPrimary, fontFamily: fontFamily.bold, fontSize: 10.5 }}>{filterCount}</RNText>
            </View>
          ) : null}
        </Press>
      ) : null}
    </View>
  )
}

const TONES = {
  navy: ['navy', 'navyTint'],
  blue: ['blue', 'blueTint'],
  gold: ['goldStrong', 'goldTint'],
  green: ['green', 'greenTint'],
  red: ['red', 'redTint'],
  violet: ['violet', 'violetTint'],
  teal: ['teal', 'tealTint'],
  amber: ['amber', 'amberTint'],
  gray: ['inkSecondary', 'grayTint'],
}

// Status chip: soft tinted pill with a leading dot.
export function Badge({ label, tone = 'gray', style, dot = true }) {
  const { colors, radius, fontFamily } = useTheme()
  const [fg, bg] = TONES[tone] ?? TONES.gray
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors[bg], borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' }, style]}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors[fg] }} /> : null}
      <RNText numberOfLines={1} style={{ color: colors[fg], fontFamily: fontFamily.semibold, fontSize: 11.5 }}>{label}</RNText>
    </View>
  )
}

// Small neutral tag (skills etc.) — no dot.
export const Tag = ({ label, tone = 'gray' }) => <Badge label={label} tone={tone} dot={false} />

// Single-select chips (filters, enums). `options` are strings or { id, label }.
export function ChipRow({ options, value, onChange, allowClear, scroll = true }) {
  const { colors, radius, fontFamily } = useTheme()
  const chips = options.map((o) => (typeof o === 'string' ? { id: o, label: o } : o))
  const row = (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: scroll ? 'nowrap' : 'wrap' }}>
      {chips.map((c) => {
        const active = value === c.id
        return (
          <Press
            key={c.id}
            scale={0.95}
            onPress={() => onChange(active && allowClear ? '' : c.id)}
            style={{
              minHeight: 38,
              justifyContent: 'center',
              paddingHorizontal: 15,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: active ? colors.navyTintStrong : colors.border,
              backgroundColor: active ? colors.navyTint : colors.surface,
            }}
          >
            <RNText style={{ color: active ? colors.navy : colors.inkSecondary, fontFamily: fontFamily.medium, fontSize: 13 }}>{c.label}</RNText>
          </Press>
        )
      })}
    </View>
  )
  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }} keyboardShouldPersistTaps="handled">
      {row}
    </ScrollView>
  ) : (
    row
  )
}

// Underline-free segmented control: a sliding pill behind the active segment.
export function Segmented({ options, value, onChange, style }) {
  const { colors, radius, fontFamily } = useTheme()
  const idx = Math.max(0, options.findIndex((o) => o.id === value))
  const [w, setW] = useState(0)
  const x = useRef(new Animated.Value(idx)).current
  useEffect(() => {
    Animated.spring(x, { toValue: idx, useNativeDriver: true, speed: 30, bounciness: 3 }).start()
  }, [idx, x])
  const seg = w ? (w - 8) / options.length : 0
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ flexDirection: 'row', padding: 4, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken }, style]}>
      {w ? (
        <Animated.View
          style={{ position: 'absolute', top: 4, left: 4, width: seg, height: 40, borderRadius: radius.md + 2, backgroundColor: colors.surface, ...shadowFor(colors), transform: [{ translateX: x.interpolate({ inputRange: [0, options.length], outputRange: [0, seg * options.length] }) }] }}
        />
      ) : null}
      {options.map((o) => (
        <Pressable key={o.id} onPress={() => onChange(o.id)} style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
          <RNText numberOfLines={1} style={{ fontFamily: value === o.id ? fontFamily.semibold : fontFamily.medium, fontSize: 13.5, color: value === o.id ? colors.ink : colors.inkSecondary }}>{o.label}</RNText>
          {o.count != null ? <RNText style={{ fontFamily: fontFamily.medium, fontSize: 11.5, color: colors.inkTertiary }}>{o.count}</RNText> : null}
        </Pressable>
      ))}
    </View>
  )
}

const AVATAR_TONES = ['navy', 'green', 'teal', 'blue']
export function Avatar({ name, size = 44 }) {
  const { colors, fontFamily } = useTheme()
  const tone = AVATAR_TONES[[...(name ?? '?')].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_TONES.length]
  const [fg, bg] = TONES[tone]
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors[bg], alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ color: colors[fg], fontFamily: fontFamily.bold, fontSize: size * 0.36 }}>{initialsOf(name) || '?'}</RNText>
    </View>
  )
}

export function KeyValue({ label, value }) {
  if (value == null || value === '') return null
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
      <Text variant="label" style={{ flexShrink: 0 }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  )
}

export function SectionTitle({ children, action, onAction, style }) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }, style]}>
      <Text variant="section">{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}>
          <Text variant="label" color="navy">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

// ─── AI match indicator ─────────────────────────────────────────────────────────────────
// Animated fill bar + percentage. Subtle sparkle glyph marks it as MZOBS-computed.
export function MatchBadge({ pct, compact, label = 'Match' }) {
  const { colors, radius, fontFamily } = useTheme()
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: pct, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [pct, v])
  if (pct == null) return null
  const [fg, bg] = TONES[matchTone(pct)]
  return (
    <View style={{ alignItems: compact ? 'flex-end' : 'flex-start', gap: 5, minWidth: compact ? 64 : 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name="sparkles" size={compact ? 11 : 13} color={colors[fg]} />
        <RNText style={{ fontFamily: fontFamily.bold, fontSize: compact ? 14 : 16, color: colors[fg] }}>{pct}%</RNText>
        <RNText style={{ fontFamily: fontFamily.medium, fontSize: 11.5, color: colors.inkSecondary }}>{label}</RNText>
      </View>
      <View style={{ alignSelf: 'stretch', height: 4, borderRadius: radius.pill, backgroundColor: colors[bg], overflow: 'hidden' }}>
        <Animated.View style={{ height: 4, borderRadius: radius.pill, backgroundColor: colors[fg], width: v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
      </View>
    </View>
  )
}

export function ProgressBar({ value, tone = 'navy', height = 5 }) {
  const { colors, radius } = useTheme()
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(1, value)), duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [value, v])
  const [fg, bg] = TONES[tone]
  return (
    <View style={{ height, borderRadius: radius.pill, backgroundColor: colors[bg], overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: radius.pill, backgroundColor: colors[fg], width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  )
}

// ─── Loading / empty / error ────────────────────────────────────────────────────────────
export function Skeleton({ width = '100%', height = 14, radius: r = 8, style }) {
  const { colors } = useTheme()
  const v = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.45, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [v])
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.surfaceSunken, opacity: v }, style]} />
}

function SkeletonRow() {
  const { colors, radius, spacing } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      <Skeleton width={44} height={44} radius={17} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="75%" height={11} />
        <Skeleton width="40%" height={11} />
      </View>
    </View>
  )
}

// Shaped skeletons per screen type — used wherever a spinner would otherwise sit.
export function Loading({ kind = 'list' }) {
  const { colors, radius, spacing } = useTheme()
  const pad = { padding: spacing.lg, gap: spacing.md }
  let body
  if (kind === 'dashboard')
    body = (
      <>
        <Skeleton width="60%" height={26} />
        <Skeleton width="45%" height={13} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton height={92} radius={radius.lg} style={{ flex: 1 }} />
          <Skeleton height={92} radius={radius.lg} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton height={92} radius={radius.lg} style={{ flex: 1 }} />
          <Skeleton height={92} radius={radius.lg} style={{ flex: 1 }} />
        </View>
        <Skeleton width="40%" height={18} style={{ marginTop: 8 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} width={120} height={96} radius={radius.lg} />)}</View>
        <SkeletonRow />
        <SkeletonRow />
      </>
    )
  else if (kind === 'profile')
    body = (
      <>
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <Skeleton width={84} height={84} radius={32} />
          <Skeleton width="50%" height={20} />
          <Skeleton width="35%" height={13} />
        </View>
        <Skeleton height={84} radius={radius.lg} />
        <Skeleton height={140} radius={radius.lg} />
        <Skeleton height={110} radius={radius.lg} />
      </>
    )
  else body = [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, pad]}>{body}</View>
}

export function FooterLoading() {
  const { colors } = useTheme()
  return <ActivityIndicator style={{ padding: 20 }} color={colors.navy} />
}

export function Empty({ icon = 'inbox', title, hint, action, onAction, secondary, onSecondary }) {
  const { colors } = useTheme()
  return (
    <FadeIn style={{ alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 28 }}>
      <View style={{ width: 76, height: 76, borderRadius: 28, backgroundColor: colors.navyTint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Feather name={icon} size={30} color={colors.navy} />
      </View>
      <Text variant="section" style={{ textAlign: 'center' }}>{title}</Text>
      {hint ? <Text variant="body" color="inkSecondary" style={{ textAlign: 'center', maxWidth: 300 }}>{hint}</Text> : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: 12, alignSelf: 'stretch' }} /> : null}
      {secondary ? <Button title={secondary} onPress={onSecondary} variant="ghost" /> : null}
    </FadeIn>
  )
}

export function ErrorState({ message = 'Couldn’t load this.', onRetry }) {
  return <Empty icon="wifi-off" title={message} hint="Check your connection and try again." action="Try again" onAction={onRetry} />
}

// ─── Stats ──────────────────────────────────────────────────────────────────────────────
// Compact KPI: icon chip, number, label, trend line (`hint` is the backend's delta string).
export function StatTile({ label, value, hint, tone = 'navy', icon, onPress }) {
  const { colors, radius } = useTheme()
  const [fg, bg] = TONES[tone]
  const up = typeof hint === 'string' && /^\s*\+|↑|up/i.test(hint)
  const down = typeof hint === 'string' && /^\s*[-−]|↓|down/i.test(hint)
  return (
    <Card onPress={onPress} style={{ flexBasis: '47%', flexGrow: 1, padding: 14, gap: 10, borderRadius: radius.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: colors[bg], alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon ?? 'activity'} size={16} color={colors[fg]} />
        </View>
        {hint ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 }}>
            {up || down ? <Feather name={up ? 'trending-up' : 'trending-down'} size={12} color={up ? colors.green : colors.red} /> : null}
            <Text variant="caption" numberOfLines={1} style={{ color: up ? colors.green : down ? colors.red : colors.inkSecondary, fontSize: 11.5, flexShrink: 1 }}>{String(hint).replace(/^\s*[+↑↓]\s*/, '').replace(/ this (week|month)$/i, '').replace(/^No change$/i, '—')}</Text>
          </View>
        ) : null}
      </View>
      <View>
        <Text variant="display" style={{ fontSize: 26, lineHeight: 30 }}>{value ?? 0}</Text>
        <Text variant="caption">{label}</Text>
      </View>
    </Card>
  )
}

// ─── Bottom sheet ───────────────────────────────────────────────────────────────────────
// Slides up over a dimmed backdrop; tap the backdrop, the handle or the X to dismiss.
export function BottomSheet({ visible, onClose, title, children, footer }) {
  const { colors, radius, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(visible)
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (visible) {
      setMounted(true)
      Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
    } else if (mounted) {
      Keyboard.dismiss()
      Animated.timing(v, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])
  if (!mounted) return null
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ ...StyleAbsolute, backgroundColor: colors.overlay, opacity: v }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={{
            maxHeight: '88%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }],
          }}
        >
          <Pressable onPress={onClose} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
          </Pressable>
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              <Text variant="section">{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={{ width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={17} color={colors.inkSecondary} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, flexDirection: 'row', gap: spacing.sm }}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
const StyleAbsolute = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }

// ─── Swipe row ──────────────────────────────────────────────────────────────────────────
// Row that can be swiped right/left past a threshold to fire an action, then springs back.
// Pass `right`/`left` as { label, icon, tone, onTrigger }.
export function SwipeRow({ children, right, left }) {
  const { colors, radius } = useTheme()
  const x = useRef(new Animated.Value(0)).current
  const actions = useRef({ right, left })
  actions.current = { right, left }
  const THRESHOLD = 88
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          const a = actions.current
          const dx = g.dx > 0 ? (a.right ? g.dx : 0) : a.left ? g.dx : 0
          x.setValue(dx * 0.7)
        },
        onPanResponderRelease: (_, g) => {
          const a = actions.current
          Animated.spring(x, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }).start()
          if (g.dx * 0.7 > THRESHOLD && a.right) a.right.onTrigger()
          else if (g.dx * 0.7 < -THRESHOLD && a.left) a.left.onTrigger()
        },
        onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [x],
  )
  const pane = (a, side) =>
    a ? (
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleAbsolute,
          borderRadius: radius.lg,
          backgroundColor: colors[TONES[a.tone ?? 'navy'][1]],
          alignItems: side === 'right' ? 'flex-start' : 'flex-end',
          justifyContent: 'center',
          paddingHorizontal: 22,
          opacity: x.interpolate({ inputRange: side === 'right' ? [0, 40] : [-40, 0], outputRange: side === 'right' ? [0, 1] : [1, 0], extrapolate: 'clamp' }),
        }}
      >
        <View style={{ alignItems: 'center', gap: 3 }}>
          <Feather name={a.icon} size={20} color={colors[TONES[a.tone ?? 'navy'][0]]} />
          <RNText style={{ fontSize: 11.5, fontWeight: '600', color: colors[TONES[a.tone ?? 'navy'][0]] }}>{a.label}</RNText>
        </View>
      </Animated.View>
    ) : null
  return (
    <View>
      {pane(right, 'right')}
      {pane(left, 'left')}
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </View>
  )
}

// ─── Stepper + success ──────────────────────────────────────────────────────────────────
// 1 ─ 2 ─ 3 … progress; completed steps are filled with a check.
export function Stepper({ count, current, onStepPress }) {
  const { colors, fontFamily } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: count }, (_, i) => {
        const done = i < current
        const active = i === current
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i === count - 1 ? 0 : 1 }}>
            <Pressable
              disabled={!done || !onStepPress}
              onPress={() => onStepPress?.(i)}
              hitSlop={8}
              style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: done || active ? colors.primary : colors.surface, borderWidth: 1.5, borderColor: done || active ? colors.primary : colors.borderStrong }}
            >
              {done ? <Feather name="check" size={14} color={colors.onPrimary} /> : <RNText style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: active ? colors.onPrimary : colors.inkTertiary }}>{i + 1}</RNText>}
            </Pressable>
            {i < count - 1 ? <View style={{ flex: 1, height: 2, marginHorizontal: 4, borderRadius: 1, backgroundColor: done ? colors.primary : colors.border }} /> : null}
          </View>
        )
      })}
    </View>
  )
}

// Circle that pops in with a check — publish/sent confirmations.
export function SuccessCheck({ size = 88 }) {
  const { colors } = useTheme()
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 12 }).start()
  }, [v])
  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center', transform: [{ scale: v }], opacity: v }}>
      <View style={{ width: size * 0.66, height: size * 0.66, borderRadius: size / 3, backgroundColor: colors.greenDot, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="check" size={size * 0.36} color="#fff" />
      </View>
    </Animated.View>
  )
}

// ─── Website-style page pieces ──────────────────────────────────────────────────────────
// "Search candidates" headline: last word italic in the accent colour, as on the website.
export function PageTitle({ lead, accent, sub }) {
  const { colors, fontFamily } = useTheme()
  return (
    <View style={{ gap: 6 }}>
      <RNText style={{ fontFamily: fontFamily.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink }}>
        {lead} <RNText style={{ fontFamily: fontFamily.italic, fontStyle: 'italic', color: colors.navy }}>{accent}</RNText>
      </RNText>
      {sub ? <Text variant="body" color="inkSecondary">{sub}</Text> : null}
    </View>
  )
}

// Labelled on/off pill with a mini switch (AI search, Boolean …). tone: 'ai' (teal) | 'blue'.
export function TogglePill({ on, onPress, icon, label, tone = 'ai' }) {
  const { colors, radius, fontFamily } = useTheme()
  const fg = tone === 'ai' ? colors.navy : colors.blue
  const track = tone === 'ai' ? colors.teal : colors.blue
  const v = useRef(new Animated.Value(on ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: on ? 1 : 0, duration: 160, useNativeDriver: true }).start()
  }, [on, v])
  return (
    <Press
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      scale={0.96}
      style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: on ? colors.navyTintStrong : colors.border, backgroundColor: on ? (tone === 'ai' ? colors.navyTint : colors.blueTint) : colors.surface }}
    >
      <Feather name={icon} size={14} color={on ? fg : colors.inkSecondary} />
      <RNText style={{ fontFamily: fontFamily.medium, fontSize: 13, color: on ? fg : colors.inkSecondary }}>{label}</RNText>
      <View style={{ width: 26, height: 15, borderRadius: 8, padding: 2, backgroundColor: on ? track : colors.borderStrong, justifyContent: 'center' }}>
        <Animated.View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#fff', transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 11] }) }] }} />
      </View>
    </Press>
  )
}
