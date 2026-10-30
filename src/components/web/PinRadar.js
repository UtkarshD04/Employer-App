import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Briefcase, Flame, Search, Users, X } from 'lucide-react-native'
import { canonCity } from '../../lib/talent/vocab'
import { areaSummary, getCityPincodes, getPinInfo, isPinSettled, peekPinInfo, prefetchPinInfo } from '../../services/geo'
import { C, F, Skeleton, T } from '../wk'

// PIN Radar — step 3 of the Talent Radar. Every PIN code of the chosen cities as a heat tile,
// from three real sources at once:
//   talent    — PINs on candidate profiles in those cities (tile colour = how many match your filters)
//   hiring    — PINs your active openings are saved with
//   directory — the cities' India Post PIN codes, so any local area can be targeted
// Nothing is estimated: a tile only shows counts that were actually loaded.

const GAP = 6
const n = (v) => Number(v).toLocaleString('en-IN')

const MODES = {
  all: { label: 'All', keep: () => true },
  talent: { label: 'Talent', keep: (p) => p.talent > 0 },
  hiring: { label: 'Hiring', keep: (p) => p.active > 0 },
}

// Best talent first, then where you hire, then everything else by PIN.
const order = (a, b) => b.match - a.match || b.active - a.active || b.talent - a.talent || a.pin.localeCompare(b.pin)

// Columns follow the width the grid actually gets: 2 on a phone, more on a tablet.
const colsFor = (w) => (w >= 640 ? 4 : w >= 440 ? 3 : 2)

/** `hex` mixed into white by `share` (0–1) — the web's color-mix(), which React Native lacks. */
function tint(hex, share) {
  const v = parseInt(hex.slice(1), 16)
  const mix = (c) => Math.round(255 + (c - 255) * share)
  return `rgb(${mix(v >> 16)}, ${mix((v >> 8) & 255)}, ${mix(v & 255)})`
}

/** Postal areas for a PIN: the directory's (already cached) or one lookup once the tile is shown. */
function useAreas(pin) {
  const [info, setInfo] = useState(() => peekPinInfo(pin))
  const [settled, setSettled] = useState(() => isPinSettled(pin))
  useEffect(() => {
    if (info) return
    let live = true
    getPinInfo(pin).then((i) => { if (live) { setInfo(i); setSettled(true) } }).catch(() => live && setSettled(true))
    return () => { live = false }
  }, [pin, info])
  return { info, settled }
}

function PinTile({ p, width, maxMatch, hot, on, onPress }) {
  const { info, settled } = useAreas(p.pin)
  const areas = areaSummary(info?.areas ?? p.areas, 1)

  // Heat: share of the best tile's matching candidates. Tiles with no talent stay white.
  const heat = p.match > 0 ? 0.18 + 0.72 * (p.match / maxMatch) : p.talent > 0 ? 0.08 : 0
  const dark = heat > 0.55
  const fg = dark ? '#fff' : C.ink
  const label = [
    `PIN ${p.pin}`,
    areas && `(${areas})`,
    p.talent ? `${p.match} of ${p.talent} candidates match` : 'no candidates on file',
    p.active ? `${p.active} active opening${p.active === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(', ')

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({
        width, minHeight: 66, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6,
        borderWidth: on ? 2 : 1, borderStyle: !on && !heat ? 'dashed' : 'solid',
        borderColor: on ? C.accent : heat ? 'transparent' : C.line,
        backgroundColor: heat ? tint(C.accent2, heat) : '#fff',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <T s={13} w="b" c={fg} style={{ fontVariant: ['tabular-nums'] }}>{p.pin}</T>
        {hot ? <Flame size={12} color={dark ? '#fff' : C.warn} /> : null}
        {p.active > 0 ? <View style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: 4, backgroundColor: dark ? '#fff' : C.blue }} /> : null}
      </View>
      <T s={11} c={dark ? 'rgba(255,255,255,0.85)' : C.muted} numberOfLines={1} style={{ lineHeight: 14 }}>
        {areas || (settled && !info ? 'Locality unavailable' : ' ')}
      </T>
      <View style={{ marginTop: 'auto', paddingTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {p.talent > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Users size={10} color={dark ? '#fff' : C.ink2} />
            <T s={10.5} w="s" c={dark ? '#fff' : C.ink2}>{n(p.match)}<T s={10.5} c={dark ? 'rgba(255,255,255,0.75)' : C.muted}>/{n(p.talent)}</T></T>
          </View>
        ) : null}
        {p.active > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Briefcase size={10} color={dark ? '#fff' : C.ink2} />
            <T s={10.5} w="s" c={dark ? '#fff' : C.ink2}>{n(p.active)}</T>
          </View>
        ) : null}
        {!p.talent && !p.active ? <T s={10.5} c={C.muted}>Postal area</T> : null}
      </View>
    </Pressable>
  )
}

export default function PinRadar({ cities, stateName, hiring, hiringFailed, talentPins, cityOpenings, value, onPick, onClear, onRetry, onAddPins }) {
  const [mode, setMode] = useState('all')
  const [q, setQ] = useState('')
  const [width, setWidth] = useState(0)
  const [pages, setPages] = useState(1)
  const [directory, setDirectory] = useState({ key: '', rows: [], status: 'idle' })
  const [, setPinTick] = useState(0) // bumps as locality lookups land so the search re-reads the cache
  const [prefetch, setPrefetch] = useState({ running: false, failed: 0 })
  const prefetchCtl = useRef(null)
  const cityKeys = cities.map(canonCity)
  const dirKey = `${cityKeys.join('|')}#${stateName}`

  const cols = colsFor(width)
  const tileW = width ? (width - GAP * (cols - 1)) / cols : 0
  const page = cols * 4 // four rows at a time, whatever the column count
  const limit = page * pages

  // The chosen cities' India Post PIN codes.
  useEffect(() => {
    if (!cities.length) return
    let live = true
    setDirectory({ key: dirKey, rows: [], status: 'loading' })
    Promise.allSettled(cities.map((ct) => getCityPincodes(ct, stateName))).then((res) => {
      if (!live) return
      const rows = res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      setDirectory({ key: dirKey, rows, status: res.every((r) => r.status === 'rejected') ? 'error' : 'ready' })
    })
    return () => { live = false }
  }, [dirKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPages(1) }, [mode, q, dirKey])

  const pins = useMemo(() => {
    const by = new Map()
    const at = (pin) => by.get(pin) ?? by.set(pin, { pin, active: 0, talent: 0, match: 0, areas: [], inDirectory: false }).get(pin)
    for (const h of hiring) {
      if (!cityKeys.includes(canonCity(h.city))) continue
      if (stateName && h.state && canonCity(h.state) !== canonCity(stateName)) continue
      at(h.pincode).active += h.active
    }
    for (const [pin, s] of talentPins ?? []) {
      if (![...s.cities].some((k) => cityKeys.includes(k))) continue
      const p = at(pin)
      p.talent += s.total
      p.match += s.match
    }
    if (directory.key === dirKey) {
      for (const d of directory.rows) {
        const p = at(d.pincode)
        p.inDirectory = true
        p.areas = d.areas
      }
    }
    return [...by.values()].sort(order)
  }, [hiring, talentPins, directory, dirKey, stateName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focusing the search looks up locality names for every PIN not yet known (directory PINs already
  // are), so a locality search covers the whole grid, not just the tiles on screen. Lookups are
  // cached and deduped in services/geo; leaving, or the cities changing, stops the queue.
  const stopPrefetch = () => { if (prefetchCtl.current) prefetchCtl.current.cancelled = true }
  const startPrefetch = () => {
    stopPrefetch()
    const todo = pins.map((p) => p.pin).filter((pin) => !isPinSettled(pin))
    if (!todo.length) { setPrefetch({ running: false, failed: 0 }); return }
    const ctl = { cancelled: false }
    prefetchCtl.current = ctl
    setPrefetch({ running: true, failed: 0 })
    prefetchPinInfo(todo, ctl, () => setPinTick((t) => t + 1)).then(({ failed }) => {
      if (!ctl.cancelled) setPrefetch({ running: false, failed })
    })
  }
  useEffect(() => stopPrefetch, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { stopPrefetch(); setPrefetch({ running: false, failed: 0 }) }, [dirKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const located = pins.filter((p) => isPinSettled(p.pin)).length

  const counts = Object.fromEntries(Object.entries(MODES).map(([k, m]) => [k, pins.filter(m.keep).length]))
  const term = q.trim().toLowerCase()
  const shown = pins.filter(MODES[mode].keep).filter((p) => {
    if (!term) return true
    if (p.pin.startsWith(term)) return true
    const info = peekPinInfo(p.pin)
    return [...(info?.areas ?? p.areas), info?.district ?? ''].some((a) => a.toLowerCase().includes(term))
  })
  const maxMatch = Math.max(1, ...pins.map((p) => p.match))
  const hotPins = new Set(pins.filter((p) => p.match > 0).slice(0, 3).map((p) => p.pin))
  const best = pins.find((p) => p.match > 0)
  const bestAreas = best ? areaSummary(peekPinInfo(best.pin)?.areas ?? best.areas, 1) : ''
  const pinnedOpenings = pins.reduce((t, p) => t + p.active, 0)
  const unpinned = Math.max(0, cityOpenings - pinnedOpenings)
  const where = cities.length === 1 ? cities[0] : 'these cities'
  const loading = directory.status === 'loading' && directory.key === dirKey

  return (
    <View style={{ gap: 8 }} onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))}>
      {best ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: 8, backgroundColor: C.accentSoft, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Flame size={13} color={C.accentText} style={{ marginTop: 2 }} />
          <T s={12} c={C.accentText} style={{ flex: 1 }}>
            Most matching talent in {where}: <T s={12} w="b" c={C.accentText}>{best.pin}</T>
            {bestAreas ? ` (${bestAreas})` : ''} · {n(best.match)} candidate{best.match === 1 ? '' : 's'}
          </T>
        </View>
      ) : null}

      {unpinned > 0 ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, paddingHorizontal: 10, paddingVertical: 7 }}>
          <T s={11.5} c={C.muted}>
            {n(unpinned)} of your active opening{unpinned === 1 ? '' : 's'} in {where} {unpinned === 1 ? 'has' : 'have'} no PIN code, so {unpinned === 1 ? 'it isn’t' : 'they aren’t'} on the map.
            {onAddPins ? <T s={11.5} w="s" c={C.accent} onPress={onAddPins}> Add a PIN to your jobs</T> : null}
          </T>
        </View>
      ) : null}
      {hiringFailed ? (
        <View accessibilityRole="alert" style={{ borderRadius: 8, backgroundColor: C.badSoft, paddingHorizontal: 10, paddingVertical: 7 }}>
          <T s={11.5} c={C.bad}>Couldn’t load your hiring PIN codes. <T s={11.5} w="s" c={C.bad} onPress={onRetry} style={{ textDecorationLine: 'underline' }}>Retry</T></T>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel="Show PIN codes">
        {Object.entries(MODES).map(([k, m]) => {
          const on = mode === k
          const off = k !== 'all' && counts[k] === 0
          return (
            <Pressable key={k} disabled={off} onPress={() => setMode(k)} accessibilityRole="button" accessibilityState={{ selected: on, disabled: off }} hitSlop={4}
              style={{ minHeight: 30, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 12, backgroundColor: on ? C.accent : C.line2, opacity: off ? 0.4 : 1 }}>
              <T s={12} w="s" c={on ? '#fff' : C.ink2}>{m.label} <T s={12} c={on ? 'rgba(255,255,255,0.8)' : C.muted}>{counts[k]}</T></T>
            </Pressable>
          )
        })}
        {loading ? <ActivityIndicator size="small" color={C.accent} style={{ marginLeft: 'auto' }} accessibilityLabel="Loading PIN codes" /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 10 }}>
        <Search size={13} color={C.muted} />
        <TextInput value={q} onChangeText={setQ} onFocus={startPrefetch} placeholder="Search PIN or locality" placeholderTextColor={C.ph} selectionColor={C.accent}
          autoCapitalize="none" autoCorrect={false} accessibilityLabel="Search PIN or locality"
          style={{ flex: 1, fontFamily: F.r, fontSize: 13, color: C.ink, paddingVertical: 0 }} />
        {q ? <Pressable onPress={() => setQ('')} accessibilityLabel="Clear search" hitSlop={8}><X size={13} color={C.muted} /></Pressable> : null}
      </View>
      {prefetch.running || prefetch.failed > 0 ? (
        <T s={11} c={C.muted} accessibilityLiveRegion="polite">
          {prefetch.running
            ? `Loading locality names… ${n(located)}/${n(pins.length)}`
            : `Locality names couldn’t be loaded for ${n(prefetch.failed)} PIN${prefetch.failed === 1 ? '' : 's'}; search those by PIN code, or tap the search again to retry.`}
        </T>
      ) : null}

      {!width ? null : shown.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {shown.slice(0, limit).map((p) => (
            <PinTile key={p.pin} p={p} width={tileW} maxMatch={maxMatch} hot={hotPins.has(p.pin)} on={value === p.pin} onPress={() => (value === p.pin ? onClear() : onPick(p.pin))} />
          ))}
        </View>
      ) : loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {Array.from({ length: cols * 2 }, (_, i) => <Skeleton key={i} w={tileW} h={66} r={10} />)}
        </View>
      ) : (
        <View style={{ borderRadius: 8, backgroundColor: C.line2, paddingHorizontal: 12, paddingVertical: 8 }}>
          <T s={12} c={C.muted}>
            {term ? 'No PIN code matches that search.' : directory.status === 'error' ? `Couldn’t load PIN codes for ${where} right now. You can still type a PIN below.` : `No PIN codes found for ${where} yet. You can still type a PIN below.`}
          </T>
        </View>
      )}
      {shown.length > limit ? (
        <Pressable onPress={() => setPages((x) => x + 1)} style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
          <T s={12.5} w="s" c={C.accent}>Show {Math.min(page, shown.length - limit)} more <T s={12.5} c={C.muted}>· {shown.length - limit} left</T></T>
        </Pressable>
      ) : null}

      {pins.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} importantForAccessibility="no-hide-descendants">
          <T s={10.5} c={C.muted}>Fewer</T>
          <LinearGradient colors={[tint(C.accent2, 0.18), C.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, height: 6, borderRadius: 3 }} />
          <T s={10.5} c={C.muted}>More talent</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue }} />
            <T s={10.5} c={C.muted}>Hiring</T>
          </View>
        </View>
      ) : null}
    </View>
  )
}
