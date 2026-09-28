import { apiClient, fetchAll } from '../lib/api'
import { lpaToRupees, rupeesToLpa } from '../lib/format'

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship']
export const WORK_MODES = ['On-site', 'Hybrid', 'Remote']
export const TRACKS = [
  { id: '', label: 'Not specified' },
  { id: 'tech', label: 'Tech' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'design', label: 'Design' },
  { id: 'sales', label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'hr', label: 'HR' },
  { id: 'support', label: 'Support' },
  { id: 'ops', label: 'Operations' },
]

// status -> { label, tone } (tone keys map to components/ui Badge)
export const JOB_STATUS = {
  draft: { label: 'Draft', tone: 'gray' },
  pending_review: { label: 'In review', tone: 'amber' },
  awaiting_payment: { label: 'Awaiting payment', tone: 'amber' },
  sourcing: { label: 'Live', tone: 'green' },
  delivered: { label: 'Delivered', tone: 'navy' },
  closed: { label: 'Closed', tone: 'gray' },
  archived: { label: 'Archived', tone: 'gray' },
}

export const listJobs = () => fetchAll('/jobs', { limit: 200, maxPages: 10 })
export const getJob = (id) => apiClient.get(`/jobs/${id}`).then((r) => r.data)
export const createJob = (body, publish) =>
  apiClient.post('/jobs', { ...body, status: publish ? 'pending_review' : 'draft' }).then((r) => r.data)
export const updateJob = (id, body) => apiClient.put(`/jobs/${id}`, body).then((r) => r.data)
export const setJobStatus = (id, status) => apiClient.patch(`/jobs/${id}/status`, { status }).then((r) => r.data)
export const duplicateJob = (id) => apiClient.post(`/jobs/${id}/duplicate`).then((r) => r.data)
export const deleteJob = (id) => apiClient.delete(`/jobs/${id}`).then((r) => r.data)

export const emptyForm = () => ({
  title: '',
  department: '',
  employmentType: 'Full-time',
  experienceMin: '0',
  experienceMax: '2',
  salaryMin: '',
  salaryMax: '',
  vacancies: '1',
  location: '',
  workMode: 'Hybrid',
  skills: '',
  track: '',
  description: '',
  benefits: '',
  deadline: '',
})

const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)

/** API job -> form values (arrays become comma lists, rupees become LPA). */
export const toForm = (j) => ({
  title: j.title ?? '',
  department: j.department ?? '',
  employmentType: j.employmentType ?? 'Full-time',
  experienceMin: String(j.experienceMin ?? 0),
  experienceMax: String(j.experienceMax ?? 2),
  salaryMin: String(rupeesToLpa(j.salaryMin)),
  salaryMax: String(rupeesToLpa(j.salaryMax)),
  vacancies: String(j.vacancies ?? 1),
  location: j.location ?? '',
  workMode: j.workMode ?? 'Hybrid',
  skills: (j.skills ?? []).join(', '),
  track: j.track ?? '',
  description: j.description ?? '',
  benefits: (j.benefits ?? []).join(', '),
  deadline: j.deadline ? String(j.deadline).slice(0, 10) : '',
})

/** Form values -> API body. */
export const toPayload = (f) => ({
  title: f.title.trim(),
  department: f.department.trim(),
  employmentType: f.employmentType,
  experienceMin: Number(f.experienceMin),
  experienceMax: Number(f.experienceMax),
  salaryMin: lpaToRupees(f.salaryMin),
  salaryMax: lpaToRupees(f.salaryMax),
  vacancies: Number(f.vacancies),
  location: f.location.trim(),
  workMode: f.workMode,
  skills: csv(f.skills),
  track: f.track,
  description: f.description.trim(),
  benefits: csv(f.benefits),
  deadline: f.deadline,
})

export function validate(f) {
  const e = {}
  if (!f.title.trim()) e.title = 'Add a job title'
  if (!f.department.trim()) e.department = 'Add a department'
  if (!f.location.trim()) e.location = 'Add a location'
  if (f.experienceMin === '' || f.experienceMax === '' || Number(f.experienceMin) > Number(f.experienceMax)) e.experience = 'Minimum experience can’t exceed maximum'
  if (f.salaryMin === '' || f.salaryMax === '' || Number(f.salaryMin) > Number(f.salaryMax)) e.salary = 'Enter a salary range (minimum ≤ maximum)'
  if (!(Number(f.vacancies) >= 1)) e.vacancies = 'At least 1 opening'
  if (f.description.trim().length < 30) e.description = 'Describe the role in at least 30 characters'
  if (!f.deadline) e.deadline = 'Pick an application deadline'
  else if (f.deadline < new Date().toISOString().slice(0, 10)) e.deadline = 'Deadline is in the past'
  return e
}

/** Plan-required failures (publishing needs an active employer plan) get their own path. */
export function isPlanRequired(err) {
  return err?.response?.data?.code === 'EMPLOYER_SUBSCRIPTION_REQUIRED'
}
