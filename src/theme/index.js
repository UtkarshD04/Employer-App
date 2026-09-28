import { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { dark, light } from './colors'

export { light, dark } from './colors'

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 }
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 }
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  italic: 'Inter_600SemiBold_Italic',
}

const ThemeContext = createContext(null)

// Light only — the recruiter website has no dark mode and the app mirrors it. The dark palette
// stays in colors.js; flip FORCE_LIGHT to follow the phone's setting again.
const FORCE_LIGHT = true

export function ThemeProvider({ children }) {
  const scheme = useColorScheme()
  const isDark = !FORCE_LIGHT && scheme === 'dark'
  const value = useMemo(() => ({ colors: isDark ? dark : light, radius, spacing, fontFamily, isDark }), [isDark])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
