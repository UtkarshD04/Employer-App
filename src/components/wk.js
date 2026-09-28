// "Web kit" — the recruiter website's design language (Recruiter-Frontend/src/index.css +
// components/ui.jsx) rebuilt for React Native: same tokens, pill buttons, chips, match ring,
// sheets and inputs. The website is light-only, so these screens are too.
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Easing, Keyboard, KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle } from 'react-native-svg'
import { AlertTriangle, Check, ChevronDown, Clock, Minus, ShieldCheck, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { matchTone } from '../lib/talent/engine'
import { escapeRegex } from '../lib/tfmt'

export const C = {
  bg: '#f6f8fb', surface: '#ffffff', ink: '#0e2237', ink2: '#33506a', muted: '#5a7488', line: '#dfe7ee', line2: '#eef3f6', panel: '#f5f9fb',
  accent: '#08685e', accent2: '#0a8a7a', accentSoft: '#e6f7f3', accentText: '#0a6f64', blue: '#1c68ab', blueText: '#1f6fb2', blueSoft: '#e9f2fc',
  ai: '#0f9e8e', aiSoft: '#e1f5f0', aiLine: '#bfe6df', ok: '#187a4d', okText: '#1a8f5a', okSoft: '#e3f5ea', okLine: '#bfe8cf',
  warn: '#a8500c', warnSoft: '#fdf0dd', warnLine: '#f3dfb8', bad: '#d33a2c', badSoft: '#fdecec', icon: '#7d93a6', ph: '#8aa0b2', amber: '#f59e0b',
}
export const F = { r: 'Inter_400Regular', m: 'Inter_500Medium', s: 'Inter_600SemiBold', b: 'Inter_700Bold', x: 'Inter_800ExtraBold', i: 'Inter_600SemiBold_Italic' }
const W = { r: F.r, m: F.m, s: F.s, b: F.b, x: F.x }

export const shadowCard = { shadowColor: '#0e2237', shadowOpacity: 0.07, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }
export const shadowPop = { shadowColor: '#0e2237', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 }
export const card = { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, ...shadowCard }

/** Text: size, weight (r m s b x), colour. */
export function T({ s = 14, w = 'r', c = C.ink, style, ...p }) {
  return <RNText {...p} style={[{ fontFamily: W[w], fontSize: s, color: c, lineHeight: Math.round(s * 1.45) }, style]} />
}

// ─── press feedback ─────────────────────────────────────────────────────────────────────
const AP = Animated.createAnimatedComponent(Pressable)
export function Press({ onPress, style, children, scale = 0.97, disabled, ...rest }) {
  const v = useRef(new Animated.Value(1)).current
  const to = (t) => Animated.spring(v, { toValue: t, useNativeDriver: true, speed: 80, bounciness: 0 }).start()
  return (
    <AP {...rest} disabled={disabled} onPress={onPress} onPressIn={() => to(scale)} onPressOut={() => to(1)} style={[style, { transform: [{ scale: v }] }]}>
      {children}
    </AP>
  )
}

// ─── buttons ────────────────────────────────────────────────────────────────────────────
const BTN = {
  primary: { fg: '#e8f8f5', grad: ['#123a4f', '#0e2237'] },
  ai: { fg: '#ffffff', grad: ['#0a8a7a', '#08685e'] },
  blue: { fg: '#ffffff', bg: C.blue },
  outline: { fg: C.ink, bg: '#fff', border: C.line },
  ghost: { fg: C.ink2, bg: 'transparent' },
  danger: { fg: '#fff', bg: C.bad },
}
const SIZE = { sm: { h: 34, px: 14, fs: 12.5, ic: 14 }, md: { h: 40, px: 17, fs: 13, ic: 15 }, lg: { h: 46, px: 24, fs: 14.5, ic: 16 } }

export function Btn({ variant = 'outline', size = 'md', icon: Icon, children, onPress, disabled, loading, style, textStyle, iconRight: IconR }) {
  const v = BTN[variant]
  const z = SIZE[size]
  const off = disabled || loading
  const inner = (
    <>
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : Icon ? <Icon size={z.ic} color={v.fg} strokeWidth={2} /> : null}
      {children != null ? <RNText numberOfLines={1} style={[{ fontFamily: F.b, fontSize: z.fs, color: v.fg }, textStyle]}>{children}</RNText> : null}
      {IconR ? <IconR size={z.ic} color={v.fg} /> : null}
    </>
  )
  const base = { height: z.h, paddingHorizontal: z.px, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' }
  return (
    <Press onPress={onPress} disabled={off} style={[{ opacity: off ? 0.5 : 1, borderRadius: 999 }, style]}>
      {v.grad ? (
        <LinearGradient colors={v.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[base, { shadowColor: '#0e2237', shadowOpacity: 0.25, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }]}>{inner}</LinearGradient>
      ) : (
        <View style={[base, { backgroundColor: v.bg, borderWidth: v.border ? 1 : 0, borderColor: v.border }]}>{inner}</View>
      )}
    </Press>
  )
}

export function IconBtn({ icon: Icon, onPress, label, active, size = 40, color = C.ink2, style }) {
  return (
    <Press onPress={onPress} accessibilityLabel={label} scale={0.92} style={[{ width: size, height: size, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? C.accentSoft : 'transparent' }, style]}>
      <Icon size={17} color={active ? C.accent : color} />
    </Press>
  )
}

// ─── chips / badges ─────────────────────────────────────────────────────────────────────
const CHIP = {
  neutral: { bg: '#fff', fg: C.ink2, border: C.line },
  accent: { bg: C.accentSoft, fg: C.accentText },
  ai: { bg: C.aiSoft, fg: C.accentText },
  ok: { bg: C.okSoft, fg: C.okText },
  hit: { bg: '#eaf2ff', fg: C.blueText },
  warn: { bg: C.warnSoft, fg: C.warn },
}
export function Chip({ children, tone = 'neutral', onRemove, style }) {
  const t = CHIP[tone]
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: t.border ? 1 : 0, borderColor: t.border, backgroundColor: t.bg, paddingHorizontal: 10, paddingVertical: 3.5, alignSelf: 'flex-start', maxWidth: '100%' }, style]}>
      <RNText numberOfLines={1} style={{ fontFamily: F.s, fontSize: 12, color: t.fg, flexShrink: 1 }}>{children}</RNText>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel="Remove">
          <X size={11} color={t.fg} />
        </Pressable>
      ) : null}
    </View>
  )
}

/** Small rounded-md pill (CV unlocked, Viewed, Stage…). */
export function Tag({ icon: Icon, children, bg = C.line2, fg = C.muted, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: bg, paddingHorizontal: 6, paddingVertical: 2 }, style]}>
      {Icon ? <Icon size={11} color={fg} /> : null}
      <RNText style={{ fontFamily: F.s, fontSize: 11, color: fg }}>{children}</RNText>
    </View>
  )
}

const TINTS = [['#e8f8f5', '#0a6f64'], ['#eaf3fc', '#1f6fb2'], ['#e6f6ee', '#1a8f5a'], ['#f1ede5', '#7a5b2e'], ['#fbeee3', '#b45309']]
export function Avatar({ candidate, size = 44 }) {
  let h = 0
  for (const ch of String(candidate?.id ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const [bg, fg] = TINTS[h % TINTS.length]
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontFamily: F.s, fontSize: size * 0.36, color: fg }}>{candidate?.initials}</RNText>
    </View>
  )
}

const MATCH = { strong: { bg: C.aiSoft, fg: C.accentText, border: C.aiLine }, good: { bg: C.blueSoft, fg: C.blueText, border: '#bfdbfe' }, fair: { bg: C.line2, fg: C.ink2, border: C.line } }
export function MatchBadge({ score, onPress }) {
  if (score == null) return null
  const t = MATCH[matchTone(score)]
  const r = 8
  const len = 2 * Math.PI * r
  return (
    <Press onPress={onPress} scale={0.96} accessibilityLabel="Why this candidate matches" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, borderColor: t.border, backgroundColor: t.bg, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Svg width={16} height={16} viewBox="0 0 20 20" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={10} cy={10} r={r} fill="none" stroke={t.fg} strokeOpacity={0.2} strokeWidth={3} />
        <Circle cx={10} cy={10} r={r} fill="none" stroke={t.fg} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${(score / 100) * len} ${len}`} />
      </Svg>
      <RNText style={{ fontFamily: F.s, fontSize: 12, color: t.fg }}>{score}% match</RNText>
    </Press>
  )
}

const STATUS = { verified: { icon: Check, bg: C.okSoft, fg: C.ok, label: 'Verified' }, pending: { icon: Clock, bg: C.warnSoft, fg: C.warn, label: 'Pending' }, none: { icon: Minus, bg: C.line2, fg: C.muted, label: 'Not verified' } }
export function StatusPill({ status, label }) {
  const s = STATUS[status] ?? STATUS.none
  return <Tag icon={s.icon} bg={s.bg} fg={s.fg}>{label ?? s.label}</Tag>
}
export function VerifiedBadge({ candidate }) {
  if (candidate.verification?.identity !== 'verified') return null
  return <Tag icon={ShieldCheck} bg={C.okSoft} fg={C.okText}>Verified</Tag>
}
export function TrustScore({ score, onPress }) {
  const color = score >= 75 ? C.ok : score >= 45 ? C.warn : C.muted
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <ShieldCheck size={13} color={color} />
      <RNText style={{ fontFamily: F.r, fontSize: 12, color: C.muted }}>Trust <RNText style={{ fontFamily: F.s, color }}>{score}</RNText>/100</RNText>
    </Pressable>
  )
}

/** Highlights search terms inside a string, like the website's <mark class="kw">. */
export function Highlight({ text, terms, style }) {
  const list = (terms ?? []).filter(Boolean)
  if (!list.length || !text) return <RNText style={style}>{text}</RNText>
  const re = new RegExp(`(${list.map(escapeRegex).join('|')})`, 'ig')
  return (
    <RNText style={style}>
      {String(text).split(re).map((part, i) => (list.some((t) => t.toLowerCase() === part.toLowerCase()) ? <RNText key={i} style={{ backgroundColor: '#d9f3ee' }}>{part}</RNText> : part))}
    </RNText>
  )
}

// ─── loading / empty ────────────────────────────────────────────────────────────────────
export function Skeleton({ w = '100%', h = 14, r = 8, style }) {
  const v = useRef(new Animated.Value(0.55)).current
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(v, { toValue: 0.55, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true })]))
    l.start()
    return () => l.stop()
  }, [v])
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: '#e9eff3', opacity: v }, style]} />
}
export function CardSkeleton() {
  return (
    <View style={[card, { padding: 16, flexDirection: 'row', gap: 14 }]}>
      <Skeleton w={44} h={44} r={22} />
      <View style={{ flex: 1, gap: 10 }}>
        <Skeleton w="40%" h={15} />
        <Skeleton w="60%" h={12} />
        <Skeleton w="80%" h={12} />
        <View style={{ flexDirection: 'row', gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} w={58} h={22} r={11} />)}</View>
      </View>
    </View>
  )
}
export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 56, paddingHorizontal: 24 }}>
      {Icon ? <View style={{ width: 40, height: 40, borderRadius: 16, backgroundColor: C.line2, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={C.muted} /></View> : null}
      <T s={15} w="s" style={{ textAlign: 'center' }}>{title}</T>
      {body ? <T s={13} c={C.muted} style={{ textAlign: 'center', maxWidth: 320 }}>{body}</T> : null}
      {action}
    </View>
  )
}
export function SectionCard({ title, action, children, style }) {
  return (
    <View style={[card, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 }}>
          <T s={15} w="s">{title}</T>
          {action}
        </View>
      ) : null}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 }}>{children}</View>
    </View>
  )
}

// ─── sheets (the website's Modal/Sheet become bottom sheets on a phone) ─────────────────
export function Sheet({ open, onClose, title, subtitle, children, footer, footerRight = true }) {
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(open)
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (open) {
      setMounted(true)
      Animated.timing(v, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
    } else if (mounted) {
      Keyboard.dismiss()
      Animated.timing(v, { toValue: 0, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  if (!mounted) return null
  const abs = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
  return (
    <RNModal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[abs, { backgroundColor: 'rgba(14,34,55,0.45)', opacity: v }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[{ maxHeight: '90%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] }, shadowPop]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flex: 1 }}>
              <T s={17} w="s">{title}</T>
              {subtitle ? <T s={13} c={C.muted} style={{ marginTop: 2 }}>{subtitle}</T> : null}
            </View>
            <IconBtn icon={X} onPress={onClose} label="Close" size={34} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}>{children}</ScrollView>
          {footer ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: footerRight ? 'flex-end' : 'flex-start', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.panel }}>{footer}</View>
          ) : (
            <View style={{ height: Math.max(insets.bottom, 8) }} />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  )
}
export const Modal = Sheet

// ─── form controls ──────────────────────────────────────────────────────────────────────
export function Input({ error, style, multiline, ...p }) {
  const [focus, setFocus] = useState(false)
  return (
    <TextInput
      placeholderTextColor={C.ph}
      selectionColor={C.accent}
      multiline={multiline}
      {...p}
      onFocus={(e) => { setFocus(true); p.onFocus?.(e) }}
      onBlur={(e) => { setFocus(false); p.onBlur?.(e) }}
      style={[{ minHeight: 40, borderWidth: 1, borderColor: error ? C.bad : focus ? C.accent : C.line, borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: multiline ? 10 : 0, fontFamily: F.r, fontSize: 14, color: C.ink }, multiline && { minHeight: 110, textAlignVertical: 'top', lineHeight: 22 }, style]}
    />
  )
}
export function Field({ label, error, hint, children, style }) {
  return (
    <View style={[{ gap: 5 }, style]}>
      {label ? <T s={12.5} w="m" c={C.ink2}>{label}</T> : null}
      {children}
      {error ? <T s={12} c={C.bad}>{error}</T> : hint ? <T s={12} c={C.muted}>{hint}</T> : null}
    </View>
  )
}
/** A <select>: shows the current label, opens a bottom sheet of options. `options`: strings or [value,label]/{value,label}. */
export function Select({ value, onChange, options, placeholder = 'Select', title, style, error }) {
  const [open, setOpen] = useState(false)
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : Array.isArray(o) ? { value: o[0], label: o[1] } : o))
  const cur = opts.find((o) => o.value === value)
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[{ minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: error ? C.bad : C.line, borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 12 }, style]}>
        <T s={14} c={cur ? C.ink : C.ph} numberOfLines={1} style={{ flex: 1 }}>{cur?.label ?? placeholder}</T>
        <ChevronDown size={15} color={C.muted} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={title ?? placeholder}>
        {opts.map((o) => (
          <Pressable key={String(o.value)} onPress={() => { onChange(o.value); setOpen(false) }} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.line2 }}>
            <T s={14.5} w={o.value === value ? 's' : 'r'} c={o.value === value ? C.accent : C.ink}>{o.label}</T>
            {o.value === value ? <Check size={16} color={C.accent} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  )
}
export function Radio({ checked, onPress, children }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: checked ? C.accentText : '#b8c7d2', alignItems: 'center', justifyContent: 'center' }}>{checked ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accentText }} /> : null}</View>
      <T s={13.5} style={{ flex: 1 }}>{children}</T>
    </Pressable>
  )
}
export function CheckBox({ checked, onChange, children, style }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={[{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 }, style]}>
      <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: checked ? C.accentText : '#b8c7d2', backgroundColor: checked ? C.accentText : '#fff', alignItems: 'center', justifyContent: 'center' }}>{checked ? <Check size={12} color="#fff" strokeWidth={3} /> : null}</View>
      {children != null ? <T s={13.5} style={{ flex: 1 }}>{children}</T> : null}
    </Pressable>
  )
}
export function Segment({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', borderRadius: 999, borderWidth: 1, borderColor: C.line, padding: 2 }}>
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={{ flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: value === v ? C.accent : 'transparent' }}>
          <RNText style={{ fontFamily: F.s, fontSize: 12, color: value === v ? '#fff' : C.muted }}>{l}</RNText>
        </Pressable>
      ))}
    </View>
  )
}
export function Banner({ tone = 'warn', icon: Icon = AlertTriangle, children, style }) {
  const t = { warn: [C.warnSoft, C.warn, C.warnLine], bad: [C.badSoft, C.bad, '#f5c6c6'], ok: [C.okSoft, C.okText, C.okLine], info: [C.blueSoft, C.blueText, '#bfdbfe'] }[tone]
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: t[2], backgroundColor: t[0], paddingHorizontal: 14, paddingVertical: 10 }, style]}>
      <Icon size={15} color={t[1]} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <T s={13.5} c={t[1]}>{children}</T> : children}</View>
    </View>
  )
}
