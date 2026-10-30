// nav: 'primary' shows in the top menu first, 'more' below it, undefined = not in nav. Same list and order as the website.
// perm: any one of these permissions shows the item (the API enforces the same rules; this only hides dead ends).
export const ROUTES = [
  { name: 'Search', label: 'Talent Search', nav: 'primary', perm: ['candidates.view'] },
  { name: 'JobTalent', label: 'Talent Pool', nav: 'primary', perm: ['candidates.view'] },
  { name: 'Overview', label: 'Overview', nav: 'primary' },
  { name: 'Jobs', label: 'Jobs', nav: 'primary', perm: ['jobs.manage', 'candidates.view'] },
  { name: 'Applicants', label: 'Applicants', nav: 'primary', perm: ['candidates.view', 'candidates.viewAssigned'] },
  { name: 'Interviews', label: 'Interviews', nav: 'primary', perm: ['candidates.view', 'candidates.viewAssigned'] },
  { name: 'Offers', label: 'Offers', nav: 'primary', perm: ['offers.manage', 'candidates.view'] },
  { name: 'Messages', label: 'Messages', nav: 'primary', perm: ['candidates.view'] },
  { name: 'Reports', label: 'Reports', nav: 'primary', perm: ['candidates.view', 'exports.run'] },
  { name: 'SavedSearches', label: 'Saved Searches', nav: 'more', perm: ['candidates.view'] },
  { name: 'Shortlists', label: 'Shortlists / Talent Pools', nav: 'more', perm: ['candidates.view'] },
  { name: 'UnlockedCvs', label: 'Unlocked CVs', nav: 'more', perm: ['candidates.view'] },
  { name: 'FeedbackFollowUps', label: 'Feedback follow-ups', nav: 'more', perm: ['candidates.view'] },
  { name: 'AITalent', label: 'AI Talent', nav: 'more', perm: ['candidates.view'] },
  { name: 'PlanCredits', label: 'CV Credits & Billing', nav: 'more', perm: ['billing.view'] },
  { name: 'Team', label: 'Team & Permissions', nav: 'more', perm: ['team.manage', 'audit.view'] },
  { name: 'Settings', label: 'Settings', nav: 'more' },
  { name: 'Help', label: 'Help & Support', nav: 'more' },
]
