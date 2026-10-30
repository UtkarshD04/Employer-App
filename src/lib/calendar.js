// A Google Calendar "add event" link for an interview. It opens in the Calendar app or the browser on both
// platforms, so there is no calendar permission to ask for.
const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function calendarLink(i) {
  const start = new Date(i.startsAt)
  const end = new Date(start.getTime() + (i.durationMins ?? 30) * 60000)
  const title = `Interview: ${i.candidateName}${i.round ? ` (${i.round})` : ''}`
  const details = [i.role, i.meetingLink ? `Join: ${i.meetingLink}` : null].filter(Boolean).join('\n')
  const params = { action: 'TEMPLATE', text: title, dates: `${stamp(start)}/${stamp(end)}`, details, location: i.mode === 'On-site' ? i.location ?? '' : i.meetingLink ?? '' }
  return `https://calendar.google.com/calendar/render?${Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`
}
