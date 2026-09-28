import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, ScrollView, View } from 'react-native'
import { AlertTriangle, ArrowLeft, Briefcase, CheckCircle2, Clock, Copy, Eye, EyeOff, ExternalLink, IndianRupee, MapPin, Pencil, Plus, Power, Rocket, Search, Sparkles, Trash2, Users } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { Shell, PageTitle, PageScroll } from '../../components/web/Shell'
import { TagInput } from '../../components/web/FilterPanel'
import { PickerField } from '../../components/web/ActionModals'
import { Banner, Btn, C, CardSkeleton, Chip, EmptyState, Field, Input, Sheet, Select, Skeleton, T, card } from '../../components/wk'
import { vocab } from '../../lib/talent/vocab'
import { useWorkspace } from '../../store/workspace'
import { getPlanSnapshot, subscribePlan } from '../../services/plan'
import { agoDate } from '../../lib/tfmt'
import { EMPLOYMENT_TYPES, FEE_PER_OPENING, RESUMES_PER_OPENING, STATUS_META, TRACKS, WORK_MODES, createJob, deleteJob, duplicateJob, getJob, jobError, listMyJobs, listPublicJobIds, publicJobUrl, rupeesToLpa, setJobStatus, toForm, toPayload, updateJob, validate } from '../../services/jobsWeb'

// Statuses the backend lists on the candidate-facing job feed.
const PUBLIC = ['sourcing', 'delivered']
const TABS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'live', label: 'Live', match: (j) => PUBLIC.includes(j.status) },
  { id: 'draft', label: 'Drafts', match: (j) => j.status === 'draft' },
  { id: 'done', label: 'Closed', match: (j) => ['closed', 'archived'].includes(j.status) },
]

function StatusPill({ status }) {
  const m = STATUS_META[status] ?? { label: status, bg: C.line2, fg: C.ink2 }
  return <View style={{ borderRadius: 6, backgroundColor: m.bg, paddingHorizontal: 8, paddingVertical: 2 }}><T s={11.5} w="s" c={m.fg}>{m.label}</T></View>
}

function Visibility({ job, publicIds }) {
  if (!publicIds || !PUBLIC.includes(job.status)) return null
  const on = publicIds.has(job.id)
  return on ? (
    <Pressable onPress={() => Linking.openURL(publicJobUrl(job.id))} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: C.okSoft, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Eye size={11} color={C.okText} /><T s={11.5} w="s" c={C.okText}>Visible to candidates</T><ExternalLink size={10} color={C.okText} />
    </Pressable>
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: C.warnSoft, paddingHorizontal: 8, paddingVertical: 2 }}>
      <EyeOff size={11} color={C.warn} /><T s={11.5} w="s" c={C.warn}>Not in candidate feed yet</T>
    </View>
  )
}

function Meta({ icon: Icon, children }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon size={13} color={C.icon} /><T s={13} c={C.ink2}>{children}</T></View>
}

function JobRow({ job, onChanged, onAsk, publicIds }) {
  const nav = useNavigation()
  const { toast } = useWorkspace()
  const [busy, setBusy] = useState(false)
  const run = async (fn, ok) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast(ok)
      await onChanged()
    } catch (e) {
      toast(jobError(e).message, { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }
  const salary = job.salaryMin != null ? `₹${rupeesToLpa(job.salaryMin)}–${rupeesToLpa(job.salaryMax)} LPA` : null
  const canFind = ['sourcing', 'delivered', 'draft'].includes(job.status)
  return (
    <View style={[card, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Pressable onPress={() => nav.navigate('JobForm', { id: job.id })}><T s={16} w="s">{job.title}</T></Pressable>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><StatusPill status={job.status} /><Visibility job={job} publicIds={publicIds} /></View>
          <T s={13} c={C.muted}>{job.department} · {job.employmentType}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ alignItems: 'flex-end' }}><T s={11} c={C.muted}>OPENINGS</T><T s={18} w="b">{job.vacancies}</T></View>
          <View style={{ alignItems: 'flex-end' }}><T s={11} c={C.muted}>SHARED</T><T s={18} w="b">{job.candidatesShared ?? 0}<T s={13} w="m" c={C.muted}>/{job.resumesPromised ?? '—'}</T></T></View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 }}>
        <Meta icon={MapPin}>{job.location} · {job.workMode}</Meta>
        <Meta icon={Clock}>{job.experienceMin}–{job.experienceMax} yrs</Meta>
        {salary ? <Meta icon={IndianRupee}>{salary}</Meta> : null}
        <Meta icon={Users}>Apply by {job.deadline}</Meta>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 12, gap: 10 }}>
        <T s={12} c={C.muted}>{job.postedOn ? `Posted ${agoDate(job.postedOn)}` : `Updated ${agoDate(job.updatedOn ?? job.updatedAt ?? new Date().toISOString())}`}{job.feeTotal ? ` · Fee ₹${job.feeTotal.toLocaleString('en-IN')} (${job.feeStatus})` : ''}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {canFind ? <Btn size="sm" variant="ai" icon={Search} onPress={() => nav.navigate('JobTalent', { jobId: job.id })}>Find talent</Btn> : null}
          {job.status === 'draft' ? <Btn size="sm" variant="primary" icon={Rocket} disabled={busy} onPress={() => run(() => setJobStatus(job.id, 'pending_review'), `“${job.title}” is live`)}>Publish</Btn> : null}
          {job.status === 'sourcing' ? <Btn size="sm" icon={Power} disabled={busy} onPress={() => run(() => setJobStatus(job.id, 'closed'), 'Job closed')}>Close</Btn> : null}
          {job.status === 'closed' ? <Btn size="sm" icon={Rocket} disabled={busy} onPress={() => run(() => setJobStatus(job.id, 'pending_review'), 'Job reopened')}>Reopen</Btn> : null}
          <Btn size="sm" icon={Pencil} onPress={() => nav.navigate('JobForm', { id: job.id })}>Edit</Btn>
          <Btn size="sm" variant="ghost" icon={Copy} disabled={busy} onPress={() => run(() => duplicateJob(job.id), 'Job duplicated as a draft')} />
          <Btn size="sm" variant="ghost" icon={Trash2} disabled={busy} onPress={() => onAsk(job)} />
        </View>
      </View>
    </View>
  )
}

export function JobsScreen({ route }) {
  const nav = useNavigation()
  const { toast } = useWorkspace()
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(false)
  const [publicIds, setPublicIds] = useState(null)
  const [tab, setTab] = useState('all')
  const [toDelete, setToDelete] = useState(null)
  const justPosted = route.params?.justPosted

  const load = useCallback(() => {
    listPublicJobIds().then(setPublicIds).catch(() => setPublicIds(null))
    return listMyJobs().then((j) => { setJobs(j); setError(false) }).catch(() => setError(true))
  }, [])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => (jobs ?? []).filter(TABS.find((t) => t.id === tab).match), [jobs, tab])
  const posted = jobs?.find((j) => j.id === justPosted)

  const confirmDelete = async () => {
    try {
      await deleteJob(toDelete.id)
      toast('Job deleted')
      setToDelete(null)
      load()
    } catch (e) {
      toast(jobError(e).message, { tone: 'warn' })
    }
  }

  return (
    <Shell>
      <PageScroll>
        <View style={{ gap: 12 }}>
          <PageTitle title="Jobs" sub="Post requirements, then search talent for each one." />
          <Btn variant="primary" size="lg" icon={Plus} onPress={() => nav.navigate('JobForm')} style={{ alignSelf: 'flex-start' }}>Post a job</Btn>
        </View>

        {posted ? (
          <View style={{ gap: 10, borderRadius: 16, borderWidth: 1, borderColor: C.okLine, backgroundColor: C.okSoft, padding: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <CheckCircle2 size={16} color={C.okText} style={{ marginTop: 2 }} />
              <T s={14} w="m" c={C.okText} style={{ flex: 1 }}>“{posted.title}” is live{publicIds?.has(posted.id) ? ' and visible to candidates' : ''}. Want to see who fits it right now?</T>
            </View>
            <Btn variant="ai" icon={Search} onPress={() => nav.navigate('JobTalent', { jobId: posted.id })}>Find candidates for this job</Btn>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line }}>
          {TABS.map((t) => {
            const n = (jobs ?? []).filter(t.match).length
            return (
              <Pressable key={t.id} onPress={() => setTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }} style={{ marginBottom: -1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: tab === t.id ? C.accent : 'transparent' }}>
                <T s={13.5} w="m" c={tab === t.id ? C.ink : C.muted}>{t.label} <T s={12} c={C.muted}>{jobs ? n : ''}</T></T>
              </Pressable>
            )
          })}
        </View>

        {error ? (
          <EmptyState icon={Briefcase} title="Couldn't load your jobs" action={<Btn onPress={load}>Retry</Btn>} />
        ) : !jobs ? (
          <View style={{ gap: 12 }}>{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</View>
        ) : shown.length === 0 ? (
          <EmptyState icon={Briefcase} title={tab === 'all' ? 'No jobs yet' : 'Nothing here'} body={tab === 'all' ? 'Post your first requirement and Mzobs will start sourcing verified candidates.' : undefined} action={tab === 'all' ? <Btn variant="primary" icon={Plus} onPress={() => nav.navigate('JobForm')}>Post a job</Btn> : null} />
        ) : (
          <View style={{ gap: 12 }}>{shown.map((j) => <JobRow key={j.id} job={j} onChanged={load} onAsk={setToDelete} publicIds={publicIds} />)}</View>
        )}
      </PageScroll>

      <Sheet open={!!toDelete} onClose={() => setToDelete(null)} title="Delete this job?" footer={<><Btn onPress={() => setToDelete(null)}>Keep it</Btn><Btn variant="danger" onPress={confirmDelete}>Delete job</Btn></>}>
        <T s={14} c={C.ink2}>“{toDelete?.title}” will be removed permanently. This can’t be undone.</T>
      </Sheet>
    </Shell>
  )
}

// ─── job form ───────────────────────────────────────────────────────────────────────────
const BLANK = { title: '', department: '', employmentType: 'Full-time', experienceMin: 0, experienceMax: 3, salaryMin: '', salaryMax: '', vacancies: 1, location: '', workMode: 'Hybrid', skills: [], track: '', description: '', benefits: [], deadline: '' }

function Section({ title, sub, children }) {
  return (
    <View style={[card, { padding: 20 }]}>
      <T s={15} w="s">{title}</T>
      {sub ? <T s={12.5} c={C.muted}>{sub}</T> : null}
      <View style={{ marginTop: 16, gap: 16 }}>{children}</View>
    </View>
  )
}
const num = (v) => String(v ?? '')
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function JobFormScreen({ route }) {
  const id = route.params?.id
  const nav = useNavigation()
  const editing = !!id
  const [f, setF] = useState(BLANK)
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(editing)
  const [missing, setMissing] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [planError, setPlanError] = useState('')
  const [apiError, setApiError] = useState('')
  const { toast } = useWorkspace()
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const [plan, setPlan] = useState(getPlanSnapshot())
  useEffect(() => subscribePlan(setPlan), [])
  const noPlan = plan && !plan.active

  useEffect(() => {
    if (!editing) return
    getJob(id)
      .then((j) => {
        if (!j) return setMissing(true)
        setF(toForm(j))
        setStatus(j.status)
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false))
  }, [id, editing])

  const live = status !== 'draft'
  const fee = useMemo(() => (Number(f.vacancies) || 0) * FEE_PER_OPENING, [f.vacancies])

  const save = async (publish) => {
    setApiError('')
    setPlanError('')
    // The API needs the same required fields for a draft as for a live job; a draft may just have a shorter description.
    const errs = validate(f)
    if (!publish && f.description.trim()) delete errs.description
    setErrors(errs)
    if (Object.keys(errs).length) return toast('Please fix the highlighted fields', { tone: 'warn' })
    setBusy(true)
    try {
      const body = toPayload(f)
      let job
      if (editing) {
        job = await updateJob(id, body)
        if (publish && status === 'draft') job = await setJobStatus(id, 'pending_review')
      } else {
        job = await createJob(body, publish)
      }
      const wentLive = publish && status === 'draft'
      toast(wentLive ? `“${job.title}” is live for candidates` : publish ? 'Changes saved' : 'Draft saved')
      nav.reset({ index: 0, routes: [{ name: 'Jobs', params: { justPosted: wentLive ? job.id : null } }] })
    } catch (e) {
      const err = jobError(e)
      if (err.plan) setPlanError(err.message)
      else setApiError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Shell><View style={{ padding: 16, gap: 16 }}><Skeleton h={96} r={16} /><Skeleton h={250} r={16} /></View></Shell>
  if (missing) return <Shell><EmptyState icon={Briefcase} title="Job not found" action={<Btn onPress={() => nav.navigate('Jobs')}>Back to jobs</Btn>} /></Shell>

  const pair = (a, b, keyA, keyB, ph, error, labelA, labelB) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Input value={num(a)} onChangeText={(v) => set({ [keyA]: v })} keyboardType="decimal-pad" placeholder={ph?.[0]} error={error} accessibilityLabel={labelA} style={{ flex: 1 }} />
      <T c={C.muted}>to</T>
      <Input value={num(b)} onChangeText={(v) => set({ [keyB]: v })} keyboardType="decimal-pad" placeholder={ph?.[1]} error={error} accessibilityLabel={labelB} style={{ flex: 1 }} />
    </View>
  )

  return (
    <Shell>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 140, gap: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 6 }}>
            <Pressable onPress={() => nav.navigate('Jobs')} style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6 }}><ArrowLeft size={14} color={C.muted} /><T s={13} w="m" c={C.muted}>Jobs</T></Pressable>
            <PageTitle title={editing ? 'Edit job' : 'Post a job'} sub="Publish a requirement and Mzobs sources verified candidates for it. You can search talent for this job right after." />
          </View>

          {noPlan && !planError ? (
            <Banner icon={AlertTriangle}>
              <T s={13.5} c={C.warn}>You need an active employer plan to save or publish jobs. <T s={13.5} w="b" c={C.warn} style={{ textDecorationLine: 'underline' }} onPress={() => nav.navigate('PlanCredits')}>Subscribe</T></T>
            </Banner>
          ) : null}
          {planError ? (
            <Banner icon={AlertTriangle}>
              <T s={13.5} w="s" c={C.warn}>Your employer plan is inactive</T>
              <T s={13.5} c={C.warn}>{planError} <T s={13.5} w="b" c={C.warn} style={{ textDecorationLine: 'underline' }} onPress={() => nav.navigate('PlanCredits')}>Subscribe on Plan & credits</T>, then come back — your form is kept.</T>
            </Banner>
          ) : null}
          {apiError ? <Banner tone="bad">{apiError}</Banner> : null}

          <Section title="Role">
            <Field label="Job title" error={errors.title}><Input value={f.title} onChangeText={(title) => set({ title })} placeholder="e.g. Senior Python Developer" error={errors.title} /></Field>
            <Field label="Department" error={errors.department}><Input value={f.department} onChangeText={(department) => set({ department })} placeholder="e.g. Engineering" error={errors.department} /></Field>
            <Field label="Employment type"><Select value={f.employmentType} onChange={(employmentType) => set({ employmentType })} options={EMPLOYMENT_TYPES} title="Employment type" /></Field>
            <Field label="Location" error={errors.location}><Input value={f.location} onChangeText={(location) => set({ location })} placeholder="City, or Remote" error={errors.location} /></Field>
            {f.location && vocab.cities.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -8 }}>
                {vocab.cities.filter((c) => c.toLowerCase().includes(f.location.toLowerCase()) && c.toLowerCase() !== f.location.toLowerCase()).slice(0, 4).map((c) => <Pressable key={c} onPress={() => set({ location: c })}><Chip>{c}</Chip></Pressable>)}
              </View>
            ) : null}
            <Field label="Work mode">
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {WORK_MODES.map((m) => (
                  <Pressable key={m} onPress={() => set({ workMode: m })} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: f.workMode === m ? C.accent : C.line, backgroundColor: f.workMode === m ? C.accentSoft : '#fff' }}>
                    <T s={13} w="m" c={f.workMode === m ? C.accentText : C.ink}>{m}</T>
                  </Pressable>
                ))}
              </View>
            </Field>
          </Section>

          <Section title="Requirements">
            <Field label="Experience (years)" error={errors.experience}>{pair(f.experienceMin, f.experienceMax, 'experienceMin', 'experienceMax', ['Min', 'Max'], errors.experience, 'Minimum experience', 'Maximum experience')}</Field>
            <Field label="Function" hint="Helps candidates on the matching track find this job."><Select value={f.track} onChange={(track) => set({ track })} options={TRACKS.map((t) => [t.id, t.label])} title="Function" /></Field>
            <Field label="Key skills"><TagInput values={f.skills} onChange={(skills) => set({ skills })} placeholder="Add a skill and press Enter" suggestions={vocab.skills} /></Field>
          </Section>

          <Section title="Compensation & openings">
            <Field label="Annual salary (₹ LPA)" error={errors.salary}>{pair(f.salaryMin, f.salaryMax, 'salaryMin', 'salaryMax', ['Min', 'Max'], errors.salary, 'Minimum salary', 'Maximum salary')}</Field>
            <Field label="Openings" error={errors.vacancies}><Input value={num(f.vacancies)} onChangeText={(vacancies) => set({ vacancies })} keyboardType="number-pad" error={errors.vacancies} /></Field>
            <Field label="Apply by" error={errors.deadline}><PickerField mode="date" value={f.deadline ? new Date(`${f.deadline}T00:00:00`) : null} onChange={(d) => set({ deadline: ymd(d) })} placeholder="Pick a date" minimumDate={new Date()} /></Field>
          </Section>

          <Section title="Description">
            <Field label="About the role" error={errors.description}><Input value={f.description} onChangeText={(description) => set({ description })} multiline style={{ minHeight: 170 }} error={errors.description} placeholder="What will this person own? What does success look like in 6 months?" /></Field>
            <Field label="Benefits (optional)"><TagInput values={f.benefits} onChange={(benefits) => set({ benefits })} placeholder="Health insurance, ESOPs…" /></Field>
          </Section>

          <View style={[card, { padding: 20, gap: 10 }]}>
            <T s={11.5} w="m" c={C.muted} style={{ letterSpacing: 0.6 }}>PREVIEW</T>
            <T s={17} w="s">{f.title || 'Job title'}</T>
            <T s={13} c={C.muted}>{f.department || 'Department'} · {f.employmentType}</T>
            <View style={{ gap: 6 }}>
              <Meta icon={MapPin}>{f.location || 'Location'} · {f.workMode}</Meta>
              <Meta icon={Clock}>{f.experienceMin}–{f.experienceMax} yrs</Meta>
              <Meta icon={IndianRupee}>{f.salaryMin !== '' && f.salaryMax !== '' ? `${f.salaryMin}–${f.salaryMax} LPA` : 'Salary range'}</Meta>
              <Meta icon={Users}>{f.vacancies || 0} opening{Number(f.vacancies) === 1 ? '' : 's'}</Meta>
            </View>
            {f.skills.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{f.skills.map((s) => <Chip key={s} tone="accent">{s}</Chip>)}</View> : null}
          </View>
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: C.aiLine, backgroundColor: C.aiSoft, padding: 16, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Sparkles size={14} color={C.accentText} /><T s={13} w="s" c={C.accentText}>What happens next</T></View>
            <T s={13} c={C.ink2}>Publishing makes the job visible to candidates. Mzobs shares up to <T s={13} w="b">{(Number(f.vacancies) || 0) * RESUMES_PER_OPENING}</T> verified resumes for {f.vacancies || 0} opening{Number(f.vacancies) === 1 ? '' : 's'}.</T>
            <T s={13} c={C.muted}>Estimated fee ₹{fee.toLocaleString('en-IN')} (₹{FEE_PER_OPENING.toLocaleString('en-IN')} per opening). The exact amount is confirmed by the server.</T>
          </View>
        </ScrollView>

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: 'rgba(255,255,255,0.97)', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Btn onPress={() => nav.navigate('Jobs')} disabled={busy}>Cancel</Btn>
          {!editing || !live ? <Btn onPress={() => save(false)} disabled={busy}>{editing ? 'Save draft' : 'Save as draft'}</Btn> : null}
          <Btn variant="primary" onPress={() => save(true)} loading={busy}>{editing && live ? 'Save changes' : 'Publish job'}</Btn>
        </View>
      </View>
    </Shell>
  )
}
