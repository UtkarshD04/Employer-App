import { useEffect, useMemo, useState } from 'react'
import { Pressable, Share, View } from 'react-native'
import { ArrowRight, ArrowLeft, Bell, BellOff, Bookmark, Briefcase, Download, Eye, FileText, FolderOpen, Mail, Pencil, Play, Plus, Search, Sparkles, Trash2, Unlock, X } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { useActions } from '../../components/web/useActions'
import CandidateCard from '../../components/web/CandidateCard'
import { Avatar, Btn, C, CardSkeleton, Chip, EmptyState, Field, Input, Press, Select, Skeleton, T, card } from '../../components/wk'
import { criteriaFromJob } from '../../lib/talent/engine'
import { criteriaToChips, makeCriteria } from '../../lib/talent/criteria'
import { getTalentMany, listJobs, searchTalent } from '../../services/talent'
import { listUnlocks } from '../../services/talentApi'
import { useWorkspace } from '../../store/workspace'
import { agoDate, lpa, years } from '../../lib/tfmt'
import { isRevealed } from '../../lib/reveal'

// ─── Shortlists ─────────────────────────────────────────────────────────────────────────
function ListDetail({ list, onBack }) {
  const { removeFromShortlist, renameShortlist, deleteShortlist, toast } = useWorkspace()
  const nav = useNavigation()
  const { onAction, host } = useActions(makeCriteria())
  const [people, setPeople] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(list.name)
  useEffect(() => {
    getTalentMany(list.candidateIds).then(setPeople)
  }, [list.candidateIds])

  return (
    <View style={{ gap: 14 }}>
      <Press onPress={onBack} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
        <ArrowLeft size={14} color={C.muted} />
        <T s={13} w="m" c={C.muted}>All shortlists</T>
      </Press>
      {renaming ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input value={name} onChangeText={setName} autoFocus style={{ flex: 1 }} />
          <Btn variant="primary" onPress={() => { if (name.trim()) renameShortlist(list.id, name.trim()); setRenaming(false) }}>Save</Btn>
        </View>
      ) : (
        <T s={26} w="b" style={{ letterSpacing: -0.5 }}>{list.name}</T>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn icon={Pencil} onPress={() => setRenaming(true)}>Rename</Btn>
        {list.id !== 'default' ? <Btn icon={Trash2} onPress={() => { deleteShortlist(list.id); toast('Shortlist deleted'); onBack() }}>Delete</Btn> : null}
      </View>
      <T s={13} c={C.muted}>{list.candidateIds.length} candidates · last activity {agoDate(list.lastActivity)}</T>

      {people && people.length === 0 ? <EmptyState icon={FolderOpen} title="This shortlist is empty" body="Use Shortlist on any candidate card to add people here." /> : null}
      {!people ? <Skeleton h={70} r={16} /> : null}
      <View style={{ gap: 8 }}>
        {people?.map((c) => (
          <View key={c.id} style={[card, { padding: 14, gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar candidate={c} size={40} />
              <View style={{ flex: 1 }}>
                <Pressable onPress={() => nav.navigate('CandidateProfile', { id: c.id })}><T s={14.5} w="s">{c.name}</T></Pressable>
                <T s={13} c={C.muted} numberOfLines={2}>{c.designation} · {years(c.experienceYears)} · {c.location} · {lpa(c.expectedSalaryLPA)}</T>
              </View>
            </View>
            {c.skills.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{c.skills.slice(0, 3).map((s) => <Chip key={s}>{s}</Chip>)}</View> : null}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Btn size="sm" icon={FileText} onPress={() => onAction('resume', c)}>View CV</Btn>
              <Btn size="sm" onPress={() => onAction('contact', c)}>Contact</Btn>
              <Btn size="sm" variant="ghost" icon={X} onPress={() => removeFromShortlist(list.id, c.id)}>Remove</Btn>
            </View>
          </View>
        ))}
      </View>
      {host}
    </View>
  )
}

export function ShortlistsScreen() {
  const { shortlists, createShortlist } = useWorkspace()
  const [openId, setOpenId] = useState(null)
  const [name, setName] = useState('')
  const open = shortlists.find((l) => l.id === openId)
  return (
    <Shell>
      <PageScroll>
        {open ? (
          <ListDetail list={open} onBack={() => setOpenId(null)} />
        ) : (
          <>
            <PageTitle title="Shortlists" sub="Talent collections — group people by role, urgency or stage." />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Input value={name} onChangeText={setName} placeholder="New shortlist, e.g. Senior Python Talent" style={{ flex: 1 }} />
              <Btn variant="primary" size="lg" icon={Plus} disabled={!name.trim()} onPress={() => { createShortlist(name); setName('') }}>Create</Btn>
            </View>
            <View style={{ gap: 12 }}>
              {shortlists.map((l) => (
                <Press key={l.id} onPress={() => setOpenId(l.id)} scale={0.985} style={[card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }]}>
                  <View style={{ flex: 1 }}>
                    <T s={15} w="s">{l.name}</T>
                    <T s={12.5} c={C.muted}>Last activity {agoDate(l.lastActivity)}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T s={22} w="b">{l.candidateIds.length}</T>
                    <T s={11.5} c={C.muted}>candidates</T>
                  </View>
                </Press>
              ))}
            </View>
          </>
        )}
      </PageScroll>
    </Shell>
  )
}

// ─── Saved searches ─────────────────────────────────────────────────────────────────────
function SavedRow({ s }) {
  const nav = useNavigation()
  const { updateSavedSearch, deleteSavedSearch, toast } = useWorkspace()
  const [count, setCount] = useState(undefined)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(s.name)
  useEffect(() => {
    searchTalent(s.criteria, { pageSize: 1 }).then((r) => setCount(r.total)).catch(() => setCount(null))
  }, [s.criteria])
  const fresh = count != null && s.lastCount != null ? Math.max(0, count - s.lastCount) : 0
  const run = () => {
    if (count != null) updateSavedSearch(s.id, { lastCount: count, lastRunAt: new Date().toISOString() })
    nav.navigate('Search', { criteria: s.criteria, nonce: Date.now() })
  }
  return (
    <View style={[card, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 8 }}>
          {editing ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Input value={name} onChangeText={setName} autoFocus style={{ flex: 1 }} />
              <Btn variant="primary" size="sm" onPress={() => { updateSavedSearch(s.id, { name: name.trim() || s.name }); setEditing(false) }}>Save</Btn>
            </View>
          ) : (
            <T s={16} w="s">{s.name}</T>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{criteriaToChips(s.criteria).slice(0, 8).map((c) => <Chip key={c.key}>{c.label}</Chip>)}</View>
        </View>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <T s={11} c={C.muted} style={{ letterSpacing: 0.5 }}>CANDIDATES</T>
            {count === undefined ? <Skeleton w={36} h={22} /> : <T s={20} w="b">{count ?? '—'}</T>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T s={11} c={C.muted} style={{ letterSpacing: 0.5 }}>NEW</T>
            <T s={20} w="b" c={fresh ? C.ok : C.muted}>{fresh ? `+${fresh}` : '0'}</T>
          </View>
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 12, gap: 10 }}>
        <T s={12} c={C.muted}>Last run {agoDate(s.lastRunAt)}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Btn size="sm" variant="primary" icon={Play} onPress={run}>Run search</Btn>
          <Btn size="sm" icon={s.alert ? BellOff : Bell} onPress={() => { updateSavedSearch(s.id, { alert: !s.alert }); toast(s.alert ? 'Alert turned off' : 'Alert on — new matches will be flagged here') }}>{s.alert ? 'Alert on' : 'Create alert'}</Btn>
          <Btn size="sm" icon={Pencil} onPress={() => setEditing((v) => !v)}>Edit</Btn>
          <Btn size="sm" variant="ghost" icon={Trash2} onPress={() => { deleteSavedSearch(s.id); toast('Saved search deleted') }}>Delete</Btn>
        </View>
      </View>
    </View>
  )
}

export function SavedSearchesScreen() {
  const { saved } = useWorkspace()
  const nav = useNavigation()
  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Saved searches" sub="Re-run a search in one click and see who's new since you last looked." />
        {saved.length === 0 ? (
          <EmptyState icon={Bookmark} title="No saved searches yet" body="Run a search, then choose “Save search” in the filters panel." action={<Btn variant="primary" onPress={() => nav.navigate('Search')}>Search candidates</Btn>} />
        ) : (
          <View style={{ gap: 12 }}>{saved.map((s) => <SavedRow key={s.id} s={s} />)}</View>
        )}
        <T s={12} c={C.muted}>Alerts are flagged inside Mzobs on this device. Email alerts need the notifications service to be connected.</T>
      </PageScroll>
    </Shell>
  )
}

// ─── Unlocked CVs ───────────────────────────────────────────────────────────────────────
// Every candidate this company has spent a CV credit on — the recruiter's "downloaded CVs"
// folder, with contact details and the CV one tap away.
export function UnlockedCvsScreen() {
  const nav = useNavigation()
  const { onAction, host } = useActions(makeCriteria())
  const { toast } = useWorkspace()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    listUnlocks()
      .then(async (unlocks) => {
        // The unlock row only has the name; the talent pool has the full profile and unmasked contact.
        const people = await getTalentMany(unlocks.map((u) => u.candidate?.id).filter(Boolean))
        const byCandidate = new Map(people.map((p) => [p._live?.candidateId, p]))
        setRows(unlocks.map((u) => ({ ...u, person: byCandidate.get(u.candidate?.id) ?? null })))
      })
      .catch(() => setError(true))
  }, [])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!rows || !t) return rows
    return rows.filter((r) => [r.candidate?.name, r.job?.title, r.person?.designation, r.person?.location, ...(r.person?.skills ?? [])].some((v) => v?.toLowerCase().includes(t)))
  }, [rows, q])
  const credits = rows?.reduce((n, r) => n + (r.creditsUsed ?? 1), 0) ?? 0

  const exportCsv = async () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [
      ['Name', 'Email', 'Phone', 'Designation', 'Experience (yrs)', 'Location', 'Job', 'Unlocked on'].join(','),
      ...shown.map((r) => [r.candidate?.name, r.person?.contact?.email, r.person?.contact?.phone, r.person?.designation, r.person?.experienceYears, r.person?.location, r.job?.title, new Date(r.unlockedAt ?? r.createdAt).toLocaleDateString('en-IN')].map(esc).join(',')),
    ].join('\n')
    await Share.share({ title: 'mzobs-unlocked-cvs.csv', message: csv }).catch(() => {})
    toast(`Exported ${shown.length} candidate${shown.length === 1 ? '' : 's'}`)
  }

  return (
    <Shell>
      <View style={{ flex: 1 }}>
        <PageScroll>
          <View style={{ gap: 4 }}>
            <T s={28} w="x" style={{ letterSpacing: -0.6, lineHeight: 33 }}>Unlocked <T s={28} w="s" c={C.accent} style={{ fontFamily: 'Inter_600SemiBold_Italic', fontStyle: 'italic' }}>CVs</T></T>
            <T s={14} c={C.muted}>{rows ? `${rows.length} candidate${rows.length === 1 ? '' : 's'} · ${credits} CV credit${credits === 1 ? '' : 's'} used` : 'Candidates your company has unlocked with a CV credit.'}</T>
          </View>
          {rows?.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 10 }}>
                <Search size={14} color={C.muted} />
                <Input value={q} onChangeText={setQ} placeholder="Name, job, skill…" style={{ flex: 1, borderWidth: 0, minHeight: 38, paddingHorizontal: 0 }} />
              </View>
              <Btn icon={Download} disabled={!shown?.length} onPress={exportCsv}>Export CSV</Btn>
            </View>
          ) : null}

          {error ? (
            <EmptyState icon={Unlock} title="Couldn't load your unlocked CVs" body="Check your connection and reopen this page." />
          ) : rows === null ? (
            <View style={{ gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={80} r={16} />)}</View>
          ) : rows.length === 0 ? (
            <EmptyState icon={Unlock} title="No CVs unlocked yet" body="View a candidate's email, phone or CV from search — one CV credit per candidate. They'll be listed here." action={<Pressable onPress={() => nav.navigate('Search')}><T s={13} w="m" c={C.accent}>Search candidates</T></Pressable>} />
          ) : shown.length === 0 ? (
            <EmptyState icon={Search} title="No unlocked CVs match" body="Try a different name, job or skill." />
          ) : (
            <View style={{ gap: 8 }}>
              {shown.map((r) => {
                const p = r.person
                const name = r.candidate?.name ?? 'Removed candidate'
                return (
                  <View key={r.id} style={[card, { padding: 14, gap: 10 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Avatar candidate={p ?? { id: r.id, initials: name.slice(0, 1) }} size={42} />
                      <View style={{ flex: 1 }}>
                        <Pressable disabled={!p} onPress={() => nav.navigate('CandidateProfile', { id: p.id })}><T s={14.5} w="s">{name}</T></Pressable>
                        <T s={13} c={C.muted} numberOfLines={2}>{p ? [p.designation, years(p.experienceYears), p.location].filter(Boolean).join(' · ') : r.candidate?.headline}</T>
                        <T s={12} c={C.muted}>{r.job?.title ? `For ${r.job.title} · ` : ''}Unlocked {agoDate(r.unlockedAt ?? r.createdAt)}</T>
                      </View>
                    </View>
                    {p?.contact ? (
                      <View style={{ gap: 4 }}>
                        {['email', 'phone'].map((part) =>
                          isRevealed(p, part) ? (
                            <T key={part} s={13} w={part === 'email' ? 'm' : 'r'} c={part === 'email' ? C.ink : C.ink2}>{p.contact[part] || '—'}</T>
                          ) : (
                            <Pressable key={part} onPress={() => onAction('unlock', p, part)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28 }}>
                              <T s={13} c={C.ink2}>{p._live?.contactPreview?.[part] ?? '—'}</T>
                              <Eye size={12} color={C.accent} />
                              <T s={13} w="s" c={C.accent}>View</T>
                            </Pressable>
                          ),
                        )}
                      </View>
                    ) : null}
                    {p ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Btn size="sm" icon={FileText} onPress={() => onAction('resume', p)}>View CV</Btn>
                        <Btn size="sm" variant="primary" icon={Mail} onPress={() => onAction('contact', p)}>Contact</Btn>
                      </View>
                    ) : null}
                  </View>
                )
              })}
            </View>
          )}
        </PageScroll>
        {host}
      </View>
    </Shell>
  )
}

// ─── Job talent pool ────────────────────────────────────────────────────────────────────
export function JobTalentScreen({ route }) {
  const nav = useNavigation()
  const [jobs, setJobs] = useState(null)
  const [jobId, setJobId] = useState('')
  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const job = jobs?.find((j) => j.id === jobId)
  const criteria = useMemo(() => (job ? makeCriteria(criteriaFromJob(job)) : makeCriteria()), [job])
  const { onAction, host } = useActions(criteria)

  useEffect(() => {
    listJobs()
      .then((j) => {
        setJobs(j)
        const want = route.params?.jobId
        setJobId(j.some((x) => x.id === want) ? want : j[0]?.id ?? '')
      })
      .catch(() => setJobs([]))
  }, [route.params?.jobId])
  useEffect(() => {
    if (!job) return
    setRows(null)
    searchTalent(criteria, { sort: 'match', pageSize: 10 }).then((r) => {
      setRows(r.items)
      setTotal(r.total)
    })
  }, [job, criteria])

  return (
    <Shell>
      <View style={{ flex: 1 }}>
        <PageScroll>
          <PageTitle title="Job talent pool" sub="Pick a job and Mzobs builds the search from its requirements, then ranks talent for it." />
          {jobs && jobs.length === 0 ? <EmptyState icon={Briefcase} title="No jobs to match against" body="Post a job and its requirements will drive the search here." /> : null}
          {jobs && jobs.length > 0 ? (
            <>
              <View style={[card, { padding: 16, gap: 12 }]}>
                <Field label="Find candidates for this job"><Select value={jobId} onChange={setJobId} options={jobs.map((j) => [j.id, j.title])} title="Job" /></Field>
                {job ? (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}><T s={13} c={C.muted}>Required skills: </T>{job.requiredSkills.map((s) => <Chip key={s} tone="accent">{s}</Chip>)}{!job.requiredSkills.length ? <T s={13}>—</T> : null}</View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}><T s={13} c={C.muted}>Preferred: </T>{(job.preferredSkills ?? []).map((s) => <Chip key={s}>{s}</Chip>)}{!(job.preferredSkills ?? []).length ? <T s={13}>—</T> : null}</View>
                    <T s={13}><T s={13} c={C.muted}>Experience: </T>{job.experienceMin}–{job.experienceMax} yrs</T>
                    <T s={13}><T s={13} c={C.muted}>Location: </T>{job.locations.join(', ') || '—'}</T>
                    <T s={13}><T s={13} c={C.muted}>Salary up to: </T>{job.salaryMaxLPA ? `₹${job.salaryMaxLPA} LPA` : '—'}</T>
                    <T s={13}><T s={13} c={C.muted}>Education: </T>{job.education || '—'}</T>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Sparkles size={13} color={C.accentText} />
                    <T s={12.5} c={C.accentText}>{rows ? `${total} AI-ranked candidates` : 'Ranking…'}</T>
                  </View>
                  <Btn iconRight={ArrowRight} onPress={() => nav.navigate('Search', { criteria, nonce: Date.now() })}>Refine in search</Btn>
                </View>
              </View>
              <View style={{ gap: 12 }}>
                {!rows ? [0, 1, 2].map((i) => <CardSkeleton key={i} />) : rows.map((r) => <CandidateCard key={r.candidate.id} row={r} terms={criteria.skills} onAction={onAction} />)}
              </View>
            </>
          ) : null}
          {jobs === null ? <View style={{ gap: 12 }}>{[0, 1].map((i) => <CardSkeleton key={i} />)}</View> : null}
        </PageScroll>
        {host}
      </View>
    </Shell>
  )
}
