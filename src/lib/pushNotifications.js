import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import * as notificationsService from '../services/notificationsService'

// Push needs a real phone with an EAS project id — everything here quietly no-ops otherwise.
const projectId = () => Constants.expoConfig?.extra?.eas?.projectId

// Android 13+ only shows the "Allow notifications?" prompt once a channel exists.
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
  })
}

// Registers this phone's token with the backend so company notifications reach it.
// Best-effort: denied permission, offline or missing FCM setup must never block sign-in.
export async function syncPushToken() {
  try {
    if (!Device.isDevice || !projectId()) return null
    await ensureAndroidChannel()
    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync())
    if (status !== 'granted') return null
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() })
    await notificationsService.registerExpoToken(data)
    return data
  } catch {
    return null
  }
}
