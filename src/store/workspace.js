import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Recruiter workspace state: shortlists, saved/recent searches, notes, selection, compare tray
// and toasts — the same shape and mutations as the website's store/workspace.jsx. There is no
// backend for shortlists/saved searches/notes yet, so they persist on this device (AsyncStorage).

const KEYS = { shortlists: 'mzt-shortlists', saved: 'mzt-saved-searches', recent: 'mzt-recent-searches', notes: 'mzt-notes', saved_ids: 'mzt-saved-candidates', messages: 'mzt-messages', interviews: 'mzt-interviews', viewed: 'mzt-viewed' }
const Ctx = createContext(null)
const now = () => new Date().toISOString()
const MAX_VIEWED = 1000
const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const DEFAULT_LIST = () => [{ id: 'default', name: 'Shortlisted', candidateIds: [], createdAt: now(), lastActivity: now() }]

function usePersisted(key, initial) {
  const [value, setValue] = useState(initial)
  const hydrated = useRef(false)
  useEffect(() => {
    let live = true
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (live && raw) setValue(JSON.parse(raw))
      })
      .catch(() => {})
      .finally(() => {
        hydrated.current = true
      })
    return () => {
      live = false
    }
  }, [key])
  useEffect(() => {
    if (hydrated.current) AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {})
  }, [key, value])
  return [value, setValue]
}

export function WorkspaceProvider({ children }) {
  const [shortlists, setShortlists] = usePersisted(KEYS.shortlists, DEFAULT_LIST())
  const [saved, setSaved] = usePersisted(KEYS.saved, [])
  const [recent, setRecent] = usePersisted(KEYS.recent, [])
  const [notes, setNotes] = usePersisted(KEYS.notes, {})
  const [savedIds, setSavedIds] = usePersisted(KEYS.saved_ids, [])
  const [messages, setMessages] = usePersisted(KEYS.messages, [])
  const [interviews, setInterviews] = usePersisted(KEYS.interviews, [])
  const [viewed, setViewed] = usePersisted(KEYS.viewed, {}) // candidate id → ISO time the profile was last opened
  const [selected, setSelected] = useState([])
  const [compare, setCompare] = useState([])
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismissToast = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])
  const toast = useCallback(
    (message, { tone = 'ok', action } = {}) => {
      const id = uid('t')
      setToasts((t) => [...t.slice(-3), { id, message, tone, action }])
      timers.current.set(id, setTimeout(() => dismissToast(id), 4200))
    },
    [dismissToast]
  )

  const api = useMemo(() => {
    const touch = (l) => ({ ...l, lastActivity: now() })
    return {
      shortlists, saved, recent, notes, savedIds, messages, interviews, viewed, selected, compare, toasts, toast, dismissToast,

      toggleSelect: (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
      selectMany: (ids) => setSelected((s) => [...new Set([...s, ...ids])]),
      clearSelection: () => setSelected([]),

      toggleCompare: (id) =>
        setCompare((c) => {
          if (c.includes(id)) return c.filter((x) => x !== id)
          if (c.length >= 5) {
            toast('You can compare up to 5 candidates', { tone: 'warn' })
            return c
          }
          return [...c, id]
        }),
      setCompareIds: (ids) => setCompare(ids.slice(0, 5)),
      clearCompare: () => setCompare([]),

      createShortlist: (name) => {
        const list = { id: uid('sl'), name: name.trim(), candidateIds: [], createdAt: now(), lastActivity: now() }
        setShortlists((s) => [...s, list])
        return list
      },
      renameShortlist: (id, name) => setShortlists((s) => s.map((l) => (l.id === id ? touch({ ...l, name }) : l))),
      deleteShortlist: (id) => setShortlists((s) => s.filter((l) => l.id !== id)),
      // Returns how many were newly added (computed from current state, not inside the updater).
      addToShortlist: (listId, ids) => {
        const list = shortlists.find((l) => l.id === listId)
        const fresh = ids.filter((i) => !(list?.candidateIds ?? []).includes(i))
        setShortlists((s) => s.map((l) => (l.id === listId ? touch({ ...l, candidateIds: [...l.candidateIds, ...ids.filter((i) => !l.candidateIds.includes(i))] }) : l)))
        return fresh.length
      },
      removeFromShortlist: (listId, id) => setShortlists((s) => s.map((l) => (l.id === listId ? touch({ ...l, candidateIds: l.candidateIds.filter((x) => x !== id) }) : l))),

      toggleSaved: (id) => setSavedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),

      saveSearch: (name, criteria, count) => {
        const item = { id: uid('ss'), name, criteria, createdAt: now(), lastRunAt: now(), lastCount: count ?? null, alert: false }
        setSaved((s) => [item, ...s])
        return item
      },
      updateSavedSearch: (id, patch) => setSaved((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x))),
      deleteSavedSearch: (id) => setSaved((s) => s.filter((x) => x.id !== id)),

      pushRecent: (criteria) =>
        setRecent((r) => {
          const key = JSON.stringify(criteria)
          return [{ id: uid('rs'), criteria, at: now() }, ...r.filter((x) => JSON.stringify(x.criteria) !== key)].slice(0, 8)
        }),
      clearRecent: () => setRecent([]),

      addMessage: (m) => setMessages((x) => [{ id: uid('m'), at: now(), ...m }, ...x]),
      addInterview: (i) => setInterviews((x) => [{ id: uid('iv'), createdAt: now(), status: 'planned', ...i }, ...x]),

      markViewed: (id) =>
        setViewed((v) => {
          const { [id]: _prev, ...rest } = v
          const keys = Object.keys(rest)
          const kept = keys.length >= MAX_VIEWED ? Object.fromEntries(keys.slice(keys.length - MAX_VIEWED + 1).map((k) => [k, rest[k]])) : rest
          return { ...kept, [id]: now() }
        }),

      addNote: (candidateId, text) => setNotes((n) => ({ ...n, [candidateId]: [{ id: uid('n'), text, at: now() }, ...(n[candidateId] ?? [])] })),
    }
  }, [shortlists, saved, recent, notes, savedIds, messages, interviews, viewed, selected, compare, toasts, toast, dismissToast, setShortlists, setSaved, setRecent, setNotes, setSavedIds, setMessages, setInterviews, setViewed])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useWorkspace() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return v
}
