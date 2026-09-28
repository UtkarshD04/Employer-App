import { apiClient } from '../lib/api'

export const TEAM_ROLES = ['Admin', 'Hiring Manager', 'Recruiter', 'Interviewer']
export const listTeam = () => apiClient.get('/team').then((r) => r.data)
export const inviteMember = (body) => apiClient.post('/team/invite', body).then((r) => r.data)
export const updateMemberRole = (id, role) => apiClient.patch(`/team/${id}/role`, { role }).then((r) => r.data)
export const removeMember = (id) => apiClient.delete(`/team/${id}`).then((r) => r.data)
