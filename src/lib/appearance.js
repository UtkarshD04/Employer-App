import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { applyPalette } from '../components/wk'

// Light, dark, or follow the phone. Light stays the default so nothing changes until someone picks otherwise.
// The screens read colours from the shared `C` object, so switching applies the new palette and then remounts
// the part of the tree under <RemountOnTheme> — navigation state is restored by RootNavigator so the user stays
// where they were, while the session (AuthProvider) above it is untouched.
const KEY = 'mzobs-appearance'
export const MODES = [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]

const Ctx = createContext({ mode: 'light', effective: 'light', setMode: () => {} })
export const useAppearance = () => useContext(Ctx)

export function AppearanceProvider({ children }) {
  const system = useColorScheme()
  const [mode, setModeState] = useState('light')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && MODES.some(([m]) => m === v) && setModeState(v))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])
  const setMode = useCallback((next) => {
    setModeState(next)
    AsyncStorage.setItem(KEY, next).catch(() => {})
  }, [])

  const effective = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode
  // Applied during render, before any child reads a colour.
  applyPalette(effective === 'dark')
  const value = useMemo(() => ({ mode, effective, setMode }), [mode, effective, setMode])
  if (!ready) return null
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Remounts its children when the effective theme changes, so every screen re-reads the palette. */
export function RemountOnTheme({ children }) {
  const { effective } = useAppearance()
  return <Fragment key={effective}>{children}</Fragment>
}
