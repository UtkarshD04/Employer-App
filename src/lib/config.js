import Constants from 'expo-constants'
import { Platform } from 'react-native'
import * as Device from 'expo-device'

const BACKEND_PORT = 4000

// Expo Go / native builds can't reach a bare "localhost". Derive the dev machine's LAN IP
// from the Metro host Expo Go already connected to; simulators use the host directly.
function getDevServerApiUrl() {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
  let host = hostUri?.split(':')[0]
  if (!Device.isDevice) host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
  return host ? `http://${host}:${BACKEND_PORT}` : null
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? getDevServerApiUrl() ?? `http://localhost:${BACKEND_PORT}`
export const API_BASE = `${API_URL}/api/employer`
// Resume links come back as backend-relative paths (/files/...).
export const FILE_BASE_URL = API_URL
