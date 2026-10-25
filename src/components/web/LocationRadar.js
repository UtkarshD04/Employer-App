import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native'
import { BadgeCheck, Briefcase, Building2, Check, ChevronDown, Crosshair, Globe, Layers, MapPin, Search, SlidersHorizontal, Users, X } from 'lucide-react-native'
import { canonCity } from '../../lib/talent/vocab'
import { buildLocationStats } from '../../lib/talent/geoStats'
import { getPoolRows } from '../../services/talent'
import { RADIUS_OPTIONS, areaSummary, getHiringPincodes, getLocationFacets, getPinInfo, getStates, isPin, peekPinInfo } from '../../services/geo'
import { C, Chip, F, Sheet, T } from '../wk'

// Mzobs Talent Radar — the Location filter. Four connected steps (state → city → PIN → reach)
// that all write to the same search criteria (state, locations, pincode, pinNearby, prefLocations, relocate).
// Every number is counted from candidates and job openings that are actually loaded.

const SORTS = {
  match: { label: 'Most matching candidates', by: (a, b) => b.match - a.match || b.total - a.total },
  hiring: { label: 'Most active hiring', by: (a, b) => (b.active ?? 0) - (a.active ?? 0) || b.match - a.match },
  az: { label: 'A–Z', by: (a, b) => a.label.localeCompare(b.label) },
}
const PIN_SORTS = {
  hiring: { label: 'Most active hiring', by: (a, b) => b.active - a.active || a.label.localeCompare(b.label) },
  az: { label: 'PIN A–Z', by: (a, b) => a.label.localeCompare(b.label) },
  match: { label: 'Most matching candidates', by: (a, b) => b.match - a.match || b.active - a.active || a.label.localeCompare(b.label) },
}

const n = (v) => Number(v).toLocaleString('en-IN')
const PAGE = 8

function StepLabel({ num, title, hint }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
        <T s={10.5} w="b" c="#fff" style={{ lineHeight: 13 }}>{num}</T>
      </View>
      <T s={12.5} w="s">{title}</T>
      {hint ? <T s={11.5} c={C.muted} numberOfLines={1} style={{ flexShrink: 1 }}>{hint}</T> : null}
    </View>
  )
}

/** Availability meter: share of the busiest option in this list. */
function Meter({ value, max, tone = 'accent' }) {
  const pct = max > 0 ? Math.max(value > 0 ? 6 : 0, Math.round((value / max) * 100)) : 0
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: C.line2, overflow: 'hidden', marginTop: 4 }}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: 2, backgroundColor: tone === 'blue' ? C.blue : C.accent2 }} />
    </View>
  )
}

function Stat({ icon: Icon, value, label, strong }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={`${n(value)} ${label}`}>
      <Icon size={11} color={strong ? C.accentText : C.muted} />
      <T s={11} w={strong ? 's' : 'r'} c={strong ? C.accentText : C.muted}>{n(value)}</T>
    </View>
  )
}

/**
 * Searchable picker. The trigger sits in the filter list; the options open in a sheet with a search box,
 * optional sort pills and "show more" paging. Options: { key, label, badge?, meta?, body?, alt? }.
 */
function Picker({ title, icon: Icon, value, placeholder, options, selected = [], onPick, onClear, sorts, sort, onSort, searchPlaceholder, emptyText, status, disabled, headerNote, multi }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    if (open) { setQ(''); setLimit(PAGE) }
  }, [open])
  useEffect(() => setLimit(PAGE), [q])

  const term = q.trim().toLowerCase()
  const shown = options.filter((o) => !term || o.label.toLowerCase().includes(term) || (typeof o.alt === 'function' ? o.alt() : o.alt)?.toLowerCase().includes(term))
  const pick = (o) => {
    onPick(o)
    if (!multi) setOpen(false)
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable
          disabled={disabled}
          onPress={() => setOpen(true)}
          accessibilityLabel={title}
          style={{ flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, borderColor: open ? C.accent : C.line, backgroundColor: disabled ? C.line2 : '#fff', paddingHorizontal: 12 }}
        >
          {status === 'loading' ? <ActivityIndicator size="small" color={C.accent} /> : <Icon size={14} color={C.accent} />}
          <T s={13} w={value ? 's' : 'r'} c={value ? C.ink : C.ph} numberOfLines={1} style={{ flex: 1 }}>{value || placeholder}</T>
          <ChevronDown size={14} color={C.muted} />
        </Pressable>
        {value && onClear ? (
          <Pressable onPress={onClear} accessibilityLabel={`Clear ${title}`} style={{ width: 42, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color={C.muted} />
          </Pressable>
        ) : null}
      </View>

      <Sheet open={open} onClose={() => setOpen(false)} title={title} footer={multi ? <Pressable onPress={() => setOpen(false)} style={{ flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}><T s={14} w="s" c="#fff">Done</T></Pressable> : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, borderRadius: 8, backgroundColor: C.line2, paddingHorizontal: 12 }}>
          <Search size={14} color={C.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder={searchPlaceholder} placeholderTextColor={C.ph} selectionColor={C.accent} autoCapitalize="none" autoCorrect={false} style={{ flex: 1, fontFamily: F.r, fontSize: 14, color: C.ink, paddingVertical: 0 }} />
        </View>
        {sorts ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {Object.entries(sorts).map(([k, s]) => (
              <Pressable key={k} onPress={() => onSort(k)} accessibilityState={{ selected: sort === k }} style={{ minHeight: 30, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 10, backgroundColor: sort === k ? C.accentSoft : 'transparent', borderWidth: 1, borderColor: sort === k ? C.accent : C.line }}>
                <T s={11.5} w="s" c={sort === k ? C.accentText : C.muted}>{s.label}</T>
              </Pressable>
            ))}
          </View>
        ) : null}
        {headerNote ? <T s={11} c={C.muted} style={{ marginTop: 10 }}>{headerNote}</T> : null}
        <View style={{ marginTop: 8 }}>
          {shown.length === 0 ? <T s={12.5} c={C.muted} style={{ textAlign: 'center', paddingVertical: 20 }}>{emptyText}</T> : null}
          {shown.slice(0, limit).map((o) => {
            const on = selected.includes(o.key)
            return (
              <Pressable key={o.key} onPress={() => pick(o)} style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 2, backgroundColor: on ? C.accentSoft : 'transparent' }}>
                {o.body ? (
                  <View style={{ paddingRight: 20 }}>
                    {o.body(on)}
                    {on ? <Check size={14} color={C.accent} style={{ position: 'absolute', right: 0, top: 2 }} /> : null}
                  </View>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T s={13.5} w={on ? 'b' : 's'} c={on ? C.accentText : C.ink} numberOfLines={1} style={{ flex: 1 }}>{o.label}</T>
                      {on ? <Check size={14} color={C.accent} /> : o.badge != null ? <T s={11.5} w="s" c={C.muted}>{o.badge}</T> : null}
                    </View>
                    {o.meta}
                  </>
                )}
              </Pressable>
            )
          })}
          {shown.length > limit ? (
            <Pressable onPress={() => setLimit((l) => l + PAGE)} style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
              <T s={12.5} w="s" c={C.accent}>Show {Math.min(PAGE, shown.length - limit)} more <T s={12.5} c={C.muted}>· {shown.length - limit} left</T></T>
            </Pressable>
          ) : null}
        </View>
      </Sheet>
    </View>
  )
}

/** Locality info for a PIN: status idle | loading | ok | none (no directory entry) | error. */
function usePinInfo(pin, enabled) {
  const valid = enabled && isPin(pin)
  const [st, setSt] = useState({ pin: '', status: 'idle', info: null })
  useEffect(() => {
    if (!valid) return
    const known = peekPinInfo(pin)
    if (known) { setSt({ pin, status: 'ok', info: known }); return }
    let live = true
    setSt({ pin, status: 'loading', info: null })
    getPinInfo(pin)
      .then((info) => live && setSt({ pin, status: info ? 'ok' : 'none', info }))
      .catch(() => live && setSt({ pin, status: 'error', info: null }))
    return () => { live = false }
  }, [pin, valid])
  if (!valid) return { status: 'idle', info: null }
  return st.pin === pin ? st : { status: 'loading', info: null }
}

/** One PIN suggestion: PIN — postal localities, district & state, then the real counts. */
function PinBody({ pin, cityNames, active, match, maxActive }) {
  const { status, info } = usePinInfo(pin, true)
  const areas = info ? areaSummary(info.areas) : ''
  const where = info ? [info.district, info.state].filter(Boolean).join(', ') : cityNames.join(', ')
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
        <T s={13} w="b">{pin}</T>
        {status === 'ok' && areas ? <T s={12.5} w="m" c={C.ink2} style={{ flex: 1 }}>— {areas}</T>
          : status === 'loading' ? <ActivityIndicator size="small" color={C.muted} style={{ transform: [{ scale: 0.7 }] }} />
          : <T s={12} c={C.muted} style={{ flex: 1, fontStyle: 'italic' }}>— Locality unavailable</T>}
      </View>
      <T s={11.5} c={C.muted} numberOfLines={1} style={{ marginTop: 2 }}>{where}</T>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        <Stat icon={Briefcase} value={active} label={active === 1 ? 'active opening' : 'active openings'} strong />
        <Stat icon={Users} value={match} label="matching candidates" />
      </View>
      <Meter value={active} max={maxActive} tone="blue" />
    </View>
  )
}

/** Lets a recruiter use a valid 6-digit PIN that isn't in the list (it will simply match stored PINs). */
function PinTyped({ current, known, onUse }) {
  const [v, setV] = useState('')
  const ok = isPin(v)
  const typed = usePinInfo(v, ok)
  const disabled = !ok || v === current
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <TextInput value={v} onChangeText={(t) => setV(t.replace(/\D/g, '').slice(0, 6))} onSubmitEditing={() => { if (ok) { onUse(v); setV('') } }} keyboardType="number-pad" maxLength={6} placeholder="Or type a 6-digit PIN" placeholderTextColor={C.ph} selectionColor={C.accent} accessibilityLabel="Type a PIN code" style={{ flex: 1, minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 10, fontFamily: F.r, fontSize: 13, color: C.ink }} />
        <Pressable disabled={disabled} onPress={() => { onUse(v); setV('') }} style={{ minHeight: 38, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, opacity: disabled ? 0.5 : 1 }}>
          <T s={12} w="s" c={disabled ? C.muted : C.accent}>{known?.has(v) ? 'Use' : 'Use PIN'}</T>
        </Pressable>
      </View>
      {ok ? <T s={11.5} c={C.muted} style={{ marginTop: 4 }}>{typed.status === 'loading' ? 'Looking up locality…' : typed.status === 'ok' ? `${areaSummary(typed.info.areas, 3)} · ${typed.info.district}, ${typed.info.state}` : 'Locality unavailable'}</T> : null}
    </View>
  )
}

export default function LocationRadar({ criteria: c, set, meta, relocationEnabled, customPanel }) {
  const [rows, setRows] = useState([])
  const [facets, setFacets] = useState([])
  const [hiring, setHiring] = useState([])
  const [hiringFailed, setHiringFailed] = useState(false)
  const [geoStates, setGeoStates] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [attempt, setAttempt] = useState(0)
  const [citySort, setCitySort] = useState('match')
  const [pinSort, setPinSort] = useState('hiring')
  const [customOpen, setCustomOpen] = useState(c.prefLocations.length > 0 || c.relocate)
  const [distOpen, setDistOpen] = useState(false)

  // Reference data: the candidate pool, this company's job cities, and the state / UT list.
  useEffect(() => {
    let live = true
    setStatus('loading')
    Promise.all([
      getPoolRows(),
      getLocationFacets().catch(() => []),
      getStates().catch(() => []),
      getHiringPincodes().then((r) => ({ rows: r, failed: false })).catch(() => ({ rows: [], failed: true })),
    ])
      .then(([r, f, s, h]) => { if (live) { setRows(r); setFacets(f); setGeoStates(s); setHiring(h.rows); setHiringFailed(h.failed); setStatus('ready') } })
      .catch(() => live && setStatus('error'))
    return () => { live = false }
  }, [meta?.syncedAt, attempt])

  // "Matching" counts follow every other active filter, so recompute as they change.
  const lazy = useDeferredValue(c)
  const stats = useMemo(() => (status === 'ready' ? buildLocationStats(rows, lazy, facets) : null), [status, rows, lazy, facets])

  const hasCandidateGeo = !!stats && stats.cities.size > 0
  const selCities = c.locations
  const selKeys = selCities.map(canonCity)
  const stateKey = canonCity(c.state)

  // ---- Step 1: states ----
  const stateOptions = useMemo(() => {
    const names = new Map()
    geoStates.forEach((s) => names.set(canonCity(s), s))
    stats?.states.forEach((s, k) => { if (!names.has(k)) names.set(k, s.name) })
    const out = [...names].map(([k, name]) => {
      const s = stats?.states.get(k)
      return { key: k, label: name, total: s?.total ?? 0, match: s?.match ?? 0, badge: s?.total ? n(s.total) : null }
    })
    return out.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
  }, [geoStates, stats])
  const allStates = { key: '__all', label: 'All States', badge: stats ? n(rows.length) : null }

  // ---- Step 2: cities (of the chosen state, or everywhere) ----
  const cityOptions = useMemo(() => {
    if (!stats) return []
    const list = [...stats.cities.values()].filter((ct) => !stateKey || ct.states.has(stateKey))
    const max = Math.max(1, ...list.map((x) => x.match))
    return list.map((ct) => ({
      key: ct.key, label: ct.name, match: ct.match, total: ct.total, active: ct.active, badge: null,
      meta: (
        <View style={{ marginTop: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Stat icon={Briefcase} value={ct.active} label="active openings" />
            <Stat icon={BadgeCheck} value={ct.verified} label="verified candidates" />
            <Stat icon={Users} value={ct.match} label="match your filters" strong />
          </View>
          <Meter value={ct.match} max={max} />
        </View>
      ),
    }))
  }, [stats, stateKey])
  const sortedCities = useMemo(() => [...cityOptions].sort(SORTS[citySort].by), [cityOptions, citySort])

  // ---- Step 3: PIN codes where this company has active openings in the chosen cities ----
  // Driven by the jobs' own PIN (GET /jobs/hiring-pincodes), not by where candidates live.
  const hiringPins = useMemo(() => {
    if (!selKeys.length) return []
    const by = new Map()
    for (const h of hiring) {
      if (!selKeys.includes(canonCity(h.city))) continue
      if (stateKey && h.state && canonCity(h.state) !== stateKey) continue
      const e = by.get(h.pincode) ?? { pin: h.pincode, active: 0, cityNames: new Set() }
      e.active += h.active
      e.cityNames.add(h.city)
      by.set(h.pincode, e)
    }
    return [...by.values()]
  }, [hiring, stateKey, selKeys.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const pinnedOpenings = hiringPins.reduce((t, p) => t + p.active, 0)
  const cityOpenings = selKeys.reduce((t, k) => t + (stats?.cities.get(k)?.active ?? 0), 0)
  const pinOptions = useMemo(() => {
    const maxActive = Math.max(1, ...hiringPins.map((p) => p.active))
    return hiringPins.map((p) => {
      const cs = stats?.pins.get(p.pin)
      return {
        key: p.pin, label: p.pin, active: p.active, match: cs?.match ?? 0,
        alt: () => (peekPinInfo(p.pin)?.areas ?? []).join(' '),
        body: () => <PinBody pin={p.pin} cityNames={[...p.cityNames]} active={p.active} match={cs?.match ?? 0} maxActive={maxActive} />,
      }
    })
  }, [hiringPins, stats])
  const sortedPins = useMemo(() => [...pinOptions].sort(PIN_SORTS[pinSort].by), [pinOptions, pinSort])
  const pinStat = c.pincode && stats?.pins.get(c.pincode)
  const pinOpen = hiringPins.find((p) => p.pin === c.pincode)?.active

  const chosen = usePinInfo(c.pincode, true)

  // ---- Handlers: a parent change resets only the dependent picks that no longer fit ----
  const cityFits = (name, sKey) => {
    const ct = stats?.cities.get(canonCity(name))
    return !sKey || !ct || ct.states.size === 0 || ct.states.has(sKey)
  }
  const pinFits = (pin, cities) => {
    const p = stats?.pins.get(pin)
    return !pin || !p || !cities.length || cities.some((x) => p.cities.has(canonCity(x)))
  }
  const pickState = (o) => {
    const name = o.key === '__all' ? '' : o.label
    const sk = canonCity(name)
    const locations = c.locations.filter((l) => cityFits(l, sk))
    const keepPin = pinFits(c.pincode, locations)
    set({ state: name, locations, ...(keepPin ? {} : { pincode: '', pinNearby: false }) })
  }
  const toggleCity = (o) => {
    const has = selKeys.includes(o.key)
    const locations = has ? c.locations.filter((l) => canonCity(l) !== o.key) : [...c.locations, o.label]
    const st = !c.state && !has ? [...(stats?.cities.get(o.key)?.states ?? [])] : []
    const keepPin = locations.length > 0 && pinFits(c.pincode, locations)
    set({ locations, ...(keepPin ? {} : { pincode: '', pinNearby: false }), ...(st.length === 1 ? { state: stateOptions.find((s) => s.key === st[0])?.label ?? c.state } : {}) })
  }
  const pickPin = (o) => set({ pincode: o.key, pinNearby: false })

  const scope = c.pincode ? (c.pinNearby ? 'nearby' : 'pin') : c.locations.length ? 'city' : c.state || c.prefLocations.length || c.relocate ? 'other' : 'anywhere'
  const anywhere = () => { set({ state: '', locations: [], pincode: '', pinNearby: false, prefLocations: [], relocate: false, alsoPreferred: true }); setCustomOpen(false) }

  const showPin = selCities.length > 0
  const showReach = selCities.length > 0 || !!c.pincode
  const loading = status === 'loading'

  const scopes = [
    { id: 'pin', label: 'This PIN', icon: Crosshair, need: !c.pincode && 'Pick a PIN code in step 3', on: () => set({ pinNearby: false }) },
    { id: 'nearby', label: 'Nearby PINs', icon: Layers, need: !c.pincode && 'Pick a PIN code in step 3', on: () => set({ pinNearby: true }) },
    { id: 'city', label: 'Entire city', icon: Building2, need: !selCities.length && 'Pick a city in step 2', on: () => set({ pincode: '', pinNearby: false }) },
    { id: 'anywhere', label: 'Anywhere', icon: Globe, on: anywhere },
  ]

  return (
    <View style={{ gap: 14 }}>
      {status === 'error' ? (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, backgroundColor: C.badSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
          <T s={12.5} c={C.bad} style={{ flex: 1 }}>Couldn’t load location data.</T>
          <Pressable onPress={() => setAttempt((x) => x + 1)} hitSlop={8}><T s={12.5} w="s" c={C.bad} style={{ textDecorationLine: 'underline' }}>Retry</T></Pressable>
        </View>
      ) : null}

      {/* Step 1 — state */}
      <View>
        <StepLabel num="1" title="State" hint={stats && stats.states.size === 0 ? 'No state on candidate profiles yet' : undefined} />
        <Picker
          title="State" icon={MapPin}
          value={c.state} placeholder="All States"
          options={[allStates, ...stateOptions]} selected={[c.state ? stateKey : '__all']}
          onPick={pickState} onClear={c.state ? () => pickState(allStates) : undefined}
          searchPlaceholder="Search state or union territory" emptyText="No matching state" status={loading ? 'loading' : undefined}
          headerNote={stats ? 'Numbers are candidates with that state on their profile.' : undefined}
        />
      </View>

      {/* Step 2 — hiring city */}
      <View>
        <StepLabel num="2" title="Hiring city" hint={c.state || undefined} />
        <Picker
          multi title="Hiring city" icon={Building2}
          value={selCities.length ? `${selCities.length} ${selCities.length === 1 ? 'city' : 'cities'} selected` : ''} placeholder={loading ? 'Loading cities…' : hasCandidateGeo ? 'Search & pick cities' : 'No cities yet'}
          options={sortedCities} selected={selKeys}
          onPick={toggleCity}
          sorts={SORTS} sort={citySort} onSort={setCitySort}
          searchPlaceholder="Search city" status={loading ? 'loading' : undefined}
          disabled={!loading && !hasCandidateGeo}
          emptyText={c.state ? `No cities with candidates or openings in ${c.state}` : 'No cities found'}
          headerNote="Openings = your active jobs · verified = identity, phone, email or résumé verified · match = fits your other filters"
        />
        {selCities.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {selCities.map((l) => <Chip key={l} tone="accent" onRemove={() => toggleCity({ key: canonCity(l), label: l })}>{l}</Chip>)}
          </View>
        ) : null}
        {selCities.length > 0 ? (
          <Pressable onPress={() => set({ alsoPreferred: !c.alsoPreferred })} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: c.alsoPreferred ? C.accentText : '#b8c7d2', backgroundColor: c.alsoPreferred ? C.accentText : '#fff', alignItems: 'center', justifyContent: 'center' }}>{c.alsoPreferred ? <Check size={12} color="#fff" strokeWidth={3} /> : null}</View>
            <T s={12.5} style={{ flex: 1 }}>Include people who prefer to relocate here</T>
          </Pressable>
        ) : null}
      </View>

      {/* Step 3 — active hiring PIN codes */}
      {showPin ? (
        <View>
          <StepLabel num="3" title="Active hiring PIN codes" />
          <T s={11.5} c={C.muted} style={{ marginBottom: 6 }}>Discover the local areas where your jobs are actively hiring.</T>
          {hiringFailed ? (
            <View accessibilityRole="alert" style={{ borderRadius: 8, backgroundColor: C.badSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
              <T s={12} c={C.bad}>Couldn’t load hiring PIN codes. <T s={12} w="s" c={C.bad} onPress={() => setAttempt((x) => x + 1)} style={{ textDecorationLine: 'underline' }}>Retry</T></T>
            </View>
          ) : (
            <>
              {!loading && hiringPins.length === 0 ? (
                <View style={{ borderRadius: 8, backgroundColor: C.line2, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <T s={12} c={C.muted}>
                    PIN-level hiring locations aren’t available yet for {selCities.length === 1 ? selCities[0] : 'these cities'}
                    {cityOpenings > 0 ? `: your ${n(cityOpenings)} active opening${cityOpenings === 1 ? '' : 's'} here ${cityOpenings === 1 ? 'has' : 'have'} a city but no PIN code.` : ' — you have no active openings with a PIN code here.'} You can still type a PIN below.
                  </T>
                </View>
              ) : null}
              {hiringPins.length > 0 ? (
                <Picker
                  title="Active hiring PIN code" icon={Crosshair}
                  value={c.pincode} placeholder={`${hiringPins.length} PIN code${hiringPins.length === 1 ? '' : 's'} hiring`}
                  options={sortedPins}
                  selected={[c.pincode]} onPick={pickPin} onClear={c.pincode ? () => set({ pincode: '', pinNearby: false }) : undefined}
                  sorts={PIN_SORTS} sort={pinSort} onSort={setPinSort}
                  searchPlaceholder="Search PIN code or locality" emptyText="No hiring PIN code matches"
                  status={loading ? 'loading' : undefined}
                  headerNote={`Openings are your active jobs saved with that PIN${cityOpenings > pinnedOpenings ? ` · ${n(cityOpenings - pinnedOpenings)} more in these cities have no PIN` : ''}. Matching = candidates with that PIN who fit your other filters.`}
                />
              ) : null}
            </>
          )}
          <PinTyped current={c.pincode} known={stats?.pins} onUse={(pin) => set({ pincode: pin, pinNearby: false })} />
          {c.pincode ? (
            <T s={11.5} c={C.muted} style={{ marginTop: 6 }}>
              {pinOpen != null ? `${n(pinOpen)} active opening${pinOpen === 1 ? '' : 's'} · ` : ''}{pinStat ? `${n(pinStat.match)} of ${n(pinStat.total)} candidates here match your filters` : 'No candidate on file with this PIN code'}
              {chosen.status === 'ok' ? ` · ${areaSummary(chosen.info.areas, 3)}, ${chosen.info.district}, ${chosen.info.state}` : chosen.status === 'loading' ? '' : ' · Locality unavailable'}
            </T>
          ) : null}
        </View>
      ) : null}

      {/* Step 4 — reach */}
      {showReach ? (
        <View>
          <StepLabel num="4" title="Search reach" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {scopes.map((s) => {
              const on = scope === s.id
              return (
                <Pressable key={s.id} disabled={!!s.need} onPress={s.on} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !!s.need }} style={{ width: '48.5%', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? C.accentSoft : '#fff', paddingHorizontal: 10, opacity: s.need ? 0.45 : 1 }}>
                  <s.icon size={13} color={on ? C.accentText : C.ink2} />
                  <T s={12.5} w="s" c={on ? C.accentText : C.ink2} numberOfLines={1} style={{ flex: 1 }}>{s.label}</T>
                </Pressable>
              )
            })}
            <Pressable onPress={() => setCustomOpen((v) => !v)} accessibilityRole="switch" accessibilityState={{ checked: customOpen }} style={{ width: '100%', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, borderColor: customOpen || c.prefLocations.length ? C.accent : C.line, backgroundColor: customOpen || c.prefLocations.length ? C.accentSoft : '#fff', paddingHorizontal: 10 }}>
              <SlidersHorizontal size={13} color={customOpen || c.prefLocations.length ? C.accentText : C.ink2} />
              <T s={12.5} w="s" c={customOpen || c.prefLocations.length ? C.accentText : C.ink2} style={{ flex: 1 }}>Custom preferred locations</T>
              {c.prefLocations.length > 0 ? <T s={11} c={C.accentText}>{c.prefLocations.length}</T> : null}
            </Pressable>
          </View>
          <T s={11.5} c={C.muted} style={{ marginTop: 6 }}>
            {scope === 'anywhere' ? 'Searching all locations.' : scope === 'nearby' ? `Candidates in PIN area ${c.pincode.slice(0, 3)}xxx.` : scope === 'pin' ? `Candidates with PIN ${c.pincode} only.` : scope === 'city' ? 'Everyone in the selected cities.' : ''}
          </T>

          <Pressable onPress={() => setDistOpen((v) => !v)} accessibilityState={{ expanded: distOpen }} style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T s={11.5} w="s" c={C.accent}>Customize radius</T>
            <ChevronDown size={12} color={C.accent} style={{ transform: [{ rotate: distOpen ? '180deg' : '0deg' }] }} />
          </Pressable>
          {distOpen ? (
            <View style={{ marginTop: 4, borderRadius: 8, borderWidth: 1, borderColor: C.line2, backgroundColor: C.panel, padding: 10 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {RADIUS_OPTIONS.filter((o) => [100, 500, 1000, 2000, 5000, 10000].includes(o.value)).map((o) => (
                  <View key={o.value} style={{ minHeight: 28, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 10, opacity: 0.6 }}>
                    <T s={11.5} w="s" c={C.muted}>{o.label.replace('Within ', '')}</T>
                  </View>
                ))}
              </View>
              <T s={11.5} c={C.muted} style={{ marginTop: 8 }}>Distance search isn’t available for candidates yet: profiles store a city and PIN code, not map coordinates, so a 100 m – 10 km radius would be a guess. Use <T s={11.5} w="b" c={C.muted}>This PIN</T> or <T s={11.5} w="b" c={C.muted}>Nearby PINs</T> for the closest honest match.</T>
            </View>
          ) : null}

          {customOpen ? <View style={{ marginTop: 8 }}>{relocationEnabled ? customPanel : <T s={12} c={C.muted}>Preferred locations aren’t available on this data yet.</T>}</View> : null}
        </View>
      ) : null}

      {!showReach && !c.state && !c.prefLocations.length && !c.relocate ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Globe size={12} color={C.muted} />
          <T s={11.5} c={C.muted} style={{ flex: 1 }}>Searching all locations. Pick a state or city to narrow.</T>
        </View>
      ) : null}
    </View>
  )
}
