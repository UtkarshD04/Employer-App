import { useSyncExternalStore } from 'react'

// "Are we reaching the server?" — set from the API client: a request that got no response at all
// marks us offline, the next response of any kind marks us back online.
let online = true
const listeners = new Set()

export function setOnline(next) {
  if (next === online) return
  online = next
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const useOnline = () => useSyncExternalStore(subscribe, () => online)
