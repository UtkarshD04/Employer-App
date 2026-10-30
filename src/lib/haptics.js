import { Platform, Vibration } from 'react-native'

// Short physical feedback for the moments that matter. React Native's Vibration is the only
// haptic API available without a native module; iOS ignores the duration and gives one tap.
const buzz = (pattern) => { try { Vibration.vibrate(pattern) } catch { /* no vibrator */ } }

export const tap = () => buzz(Platform.OS === 'ios' ? undefined : 8)
export const success = () => buzz(Platform.OS === 'ios' ? undefined : [0, 12, 60, 12])
export const warn = () => buzz(Platform.OS === 'ios' ? undefined : [0, 30, 60, 30])
