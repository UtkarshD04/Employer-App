// Per-place counts for the Location filter, derived only from loaded data:
// candidates (city / state / PIN as stored on their profile) and this company's
// own job openings (GET /jobs/location-facets). Nothing is estimated.

import { canonCity } from './vocab'
import { passesExceptLocation } from './engine'

/** "Verified" = identity, phone, email or resume has been verified on Mzobs. */
export const isVerified = (c) => Object.values(c.verification ?? {}).some((v) => v === 'verified')

const bump = (o, key) => { o[key] = (o[key] ?? 0) + 1 }
const topKey = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

/**
 * @returns {{
 *   states: Map<string, {name:string,total:number,verified:number,match:number}>,
 *   cities: Map<string, {key:string,name:string,states:Set<string>,total:number,verified:number,match:number,jobs:number,active:number}>,
 *   pins: Map<string, {pin:string,cities:Set<string>,states:Set<string>,cityNames:Set<string>,total:number,verified:number,match:number}>,
 * }}
 */
export function buildLocationStats(rows, crit, facets = []) {
  const states = new Map()
  const cities = new Map()
  const pins = new Map()
  const names = new Map() // city key → raw spellings seen

  const city = (key, name, state) => {
    let c = cities.get(key)
    if (!c) cities.set(key, (c = { key, name, states: new Set(), total: 0, verified: 0, match: 0, jobs: 0, active: 0 }))
    if (state) c.states.add(canonCity(state))
    return c
  }

  for (const c of rows) {
    const ok = passesExceptLocation(c, crit)
    const v = isVerified(c)
    const add = (s) => { s.total++; if (v) s.verified++; if (ok) s.match++ }
    const stKey = canonCity(c.state)
    if (stKey) {
      let s = states.get(stKey)
      if (!s) states.set(stKey, (s = { name: c.state.trim(), total: 0, verified: 0, match: 0 }))
      add(s)
    }
    const key = canonCity(c.location)
    if (!key) continue
    const ct = city(key, c.location.trim(), c.state)
    add(ct)
    const seen = names.get(key) ?? {}
    bump(seen, c.location.trim())
    names.set(key, seen)
    const pin = String(c.pincode ?? '').trim()
    if (/^[1-9]\d{5}$/.test(pin)) {
      let p = pins.get(pin)
      if (!p) pins.set(pin, (p = { pin, cities: new Set(), states: new Set(), cityNames: new Set(), total: 0, verified: 0, match: 0 }))
      p.cities.add(key)
      p.cityNames.add(c.location.trim())
      if (stKey) p.states.add(stKey)
      add(p)
    }
  }
  for (const [key, seen] of names) cities.get(key).name = topKey(seen)

  for (const f of facets) {
    const key = canonCity(f.city)
    if (!key) continue
    const ct = city(key, f.city.trim(), f.state)
    ct.jobs += f.count ?? 0
    ct.active += f.active ?? 0
  }
  return { states, cities, pins }
}
