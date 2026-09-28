import { AppState } from 'react-native'
import { QueryClient, focusManager } from '@tanstack/react-query'

// React Query doesn't know what "focus" means in React Native — coming back to the
// foreground refreshes stale data (new applicants, notifications).
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => handleFocus(state === 'active'))
  return () => sub.remove()
})

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export const queryKeys = {
  dashboard: ['dashboard'],
  jobs: ['jobs'],
  job: (id) => ['jobs', id],
  candidates: (filters) => ['candidates', filters],
  candidate: (id) => ['candidates', 'one', id],
  resumeSearch: (filters) => ['resume-search', filters],
  resumeProfile: (id) => ['resume-search', 'one', id],
  interviews: ['interviews'],
  offers: ['offers'],
  subscription: ['subscription'],
  credits: ['credits'],
  creditPlans: ['credit-plans'],
  purchases: ['credit-purchases'],
  unlocks: ['unlocks'],
  notifications: ['notifications'],
  team: ['team'],
  company: ['company'],
}
