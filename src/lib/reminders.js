import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Local (on-device) reminders for applicant follow-ups. One reminder per applicant: setting a new
// date replaces the old one, clearing the date cancels it. Best-effort — if notifications are
// denied the follow-up is still saved on the server, it just doesn't ring.
const KEY = 'mzobs-followup-reminders'
const HOUR = 9

const read = async () => {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') } catch { return {} }
}
const write = (map) => AsyncStorage.setItem(KEY, JSON.stringify(map)).catch(() => {})

export async function cancelFollowUpReminder(applicantId) {
  const map = await read()
  if (map[applicantId]) await Notifications.cancelScheduledNotificationAsync(map[applicantId]).catch(() => {})
  delete map[applicantId]
  await write(map)
}

/** Rings at 9am on `date` (a Date or ISO string). Returns false when it could not be scheduled. */
export async function scheduleFollowUpReminder(applicantId, name, date) {
  try {
    await cancelFollowUpReminder(applicantId)
    const at = new Date(date)
    at.setHours(HOUR, 0, 0, 0)
    if (at.getTime() <= Date.now()) return false
    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync())
    if (status !== 'granted') return false
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Follow-up due today', body: `Reach out to ${name}.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    })
    const map = await read()
    map[applicantId] = id
    await write(map)
    return true
  } catch {
    return false
  }
}
