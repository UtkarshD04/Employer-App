import { createNavigationContainerRef } from '@react-navigation/native'

// Lets code outside any screen (e.g. tapping a push notification) navigate.
export const navigationRef = createNavigationContainerRef()

// The overview's attention items link to website paths ("/applicants?stage=new", "/jobs/ID/applicants"); this maps them
// onto the app's screens.
const PATH_SCREEN = { jobs: 'Jobs', applicants: 'Applicants', interviews: 'Interviews', offers: 'Offers', credits: 'PlanCredits', messages: 'Messages', reports: 'Reports', team: 'Team', unlocked: 'UnlockedCvs', shortlists: 'Shortlists', feedback: 'FeedbackFollowUps', search: 'Search', 'talent-pool': 'JobTalent', settings: 'Settings', help: 'Help' }

export function openHref(nav, href = '') {
  const [path, query = ''] = href.split('?')
  const parts = path.split('/').filter(Boolean)
  const params = Object.fromEntries(new URLSearchParams(query))
  if (parts[0] === 'jobs' && parts[2] === 'applicants') return nav.navigate('Applicants', { jobId: parts[1], ...params })
  if (parts[0] === 'candidate' && parts[1]) return nav.navigate('CandidateProfile', { id: parts[1] })
  const screen = PATH_SCREEN[parts[0]]
  if (screen) nav.navigate(screen, params)
}
