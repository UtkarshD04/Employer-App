import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Share, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { BarChart3, Download, GitCompareArrows, Search, Users, X } from 'lucide-react-native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { InterviewModal } from '../../components/web/ActionModals'
import { ErrorBlock, ListSkeleton, useRefresh } from '../../components/web/rc'
import { ApplicantList, Board } from '../../components/web/applicants/Views'
import ApplicantSheet from '../../components/web/applicants/ApplicantSheet'
import RejectSheet from '../../components/web/applicants/RejectSheet'
import CompareSheet from '../../components/web/applicants/CompareSheet'
import JobInsights from '../../components/web/JobInsights'
import ManagedShortlist from '../../components/web/ManagedShortlist'
import { Btn, C, CheckBox, EmptyState, Input, Press, Segment, Select, T, card } from '../../components/wk'
import { useWorkspace } from '../../store/workspace'
import { apiMessage, bulkUpdateApplicants, exportApplicants, getApplicantsSummary, listApplicants, listTeam, PIPELINE, STAGE_LABEL, usePermissions } from '../../services/recruiter'

const COMPARABLE = ['shortlisted', 'interview', 'offer', 'hired']
const MOVE_TARGETS = PIPELINE.filter((s) => s.key !== 'rejected')
// The sheets sit on top of each other on a phone, so the one underneath closes before the next opens.
const AFTER_SHEET = 320

export default function ApplicantsScreen({ route }) {
  const nav = useNavigation()
  const { toast } = useWorkspace()
  const { can, loaded } = usePermissions()
  const manage = loaded && can('candidates.manage')

  const jobId = route.params?.jobId ?? 'all'
  const [view, setView] = useState('board')
  const [stage, setStage] = useState(route.params?.stage ?? 'new')
  const [q, setQ] = useState('')
  const [owner, setOwner] = useState('')
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState('recent')
  const [stageFilter, setStageFilter] = useState(route.params?.stage ?? '')
  const [followUp, setFollowUp] = useState(route.params?.followUp === 'due')

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState([])
  const [team, setTeam] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [openId, setOpenId] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [comparing, setComparing] = useState(null)
  const [scheduling, setScheduling] = useState(null)
  const [insights, setInsights] = useState(false)
  const [busy, setBusy] = useState(false)
  const req = useRef(0)

  // A link from the overview ("New applicants", a job's health row) can arrive while this screen is already mounted.
  useEffect(() => {
    const st = route.params?.stage
    if (st) { setStage(st); setStageFilter(st) }
    if (route.params?.followUp) setFollowUp(route.params.followUp === 'due')
  }, [route.params?.stage, route.params?.followUp])

  useEffect(() => {
    getApplicantsSummary().then(setJobs).catch(() => setJobs([]))
    listTeam().then(setTeam).catch(() => setTeam([]))
  }, [])

  const load = useCallback(
    ({ silent = false } = {}) => {
      const mine = ++req.current
      if (!silent) setData(null)
      setError('')
      const params = { jobId, sort, ...(q.trim() && { q: q.trim() }), ...(owner && { owner }), ...(tag && { tag }), ...(followUp && { followUp: 'due' }) }
      return listApplicants(params)
        .then((r) => mine === req.current && setData(r))
        .catch((e) => mine === req.current && setError(apiMessage(e, 'Could not load applicants.')))
    },
    [jobId, q, owner, tag, sort, followUp]
  )
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, q])
  useEffect(() => setSelected(new Set()), [jobId])

  const job = jobs.find((j) => j.id === jobId) ?? null
  const items = data?.items ?? []
  const shown = useMemo(() => (view === 'list' && stageFilter ? items.filter((c) => c.stage === stageFilter) : items), [items, view, stageFilter])
  const allTags = useMemo(() => [...new Set(items.flatMap((c) => c.tags))].sort(), [items])
  const selectedItems = items.filter((c) => selected.has(c.id))
  const counts = data?.counts ?? {}

  // Land on a stage that has someone in it instead of an empty "New" column.
  useEffect(() => {
    if (!data || route.params?.stage || (data.counts[stage] ?? 0) > 0) return
    const first = PIPELINE.find((s) => (data.counts[s.key] ?? 0) > 0)
    if (first) setStage(first.key)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const selectAll = (on) => setSelected(on ? new Set(shown.map((c) => c.id)) : new Set())
  const refresh = () => { load({ silent: true }); getApplicantsSummary().then(setJobs).catch(() => {}) }
  const afterSheet = (fn) => setTimeout(fn, AFTER_SHEET)

  const bulk = async (body, ok) => {
    setBusy(true)
    try {
      await bulkUpdateApplicants({ ids: [...selected], ...body })
      toast(ok)
      setSelected(new Set())
      refresh()
    } catch (e) {
      toast(apiMessage(e), { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }

  const canCompare = selectedItems.length >= 2 && selectedItems.length <= 4 && selectedItems.every((c) => COMPARABLE.includes(c.stage)) && new Set(selectedItems.map((c) => c.jobId)).size === 1
  const compareHint = selectedItems.length < 2 ? 'Select 2–4 shortlisted candidates to compare' : selectedItems.length > 4 ? 'Compare up to 4 candidates' : !selectedItems.every((c) => COMPARABLE.includes(c.stage)) ? 'Only shortlisted (or later) candidates can be compared' : 'Compare candidates from the same job'

  const doExport = async () => {
    try {
      const csv = await exportApplicants(jobId)
      await Share.share({ title: 'applicants.csv', message: csv })
    } catch (e) {
      toast(apiMessage(e), { tone: 'warn' })
    }
  }

  const { refreshing, onRefresh } = useRefresh(() => Promise.all([load({ silent: true }), getApplicantsSummary().then(setJobs).catch(() => {})]))
  const filtered = !!(q || owner || tag || followUp || stageFilter)
  const clearFilters = () => { setQ(''); setOwner(''); setTag(''); setFollowUp(false); setStageFilter('') }
  const jobOptions = [['all', 'All jobs'], ...jobs.map((j) => [j.id, `${j.title} (${j.total})`])]

  return (
    <Shell>
      <PageScroll onRefresh={onRefresh} refreshing={refreshing}>
        <PageTitle title={job ? job.title : 'Applicants'} sub={(job ? `${job.location ?? ''}${job.department ? ` · ${job.department}` : ''}` : 'Every candidate across your jobs, by stage.') + (data?.total != null ? ` · ${data.total} applicant${data.total === 1 ? '' : 's'}` : '')} />

        <View style={{ gap: 10 }}>
          <Select value={jobId} title="Choose job" onChange={(v) => nav.setParams({ jobId: v === 'all' ? undefined : v })} options={jobOptions} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {job ? <Btn size="sm" icon={BarChart3} onPress={() => setInsights((v) => !v)} variant={insights ? 'success' : 'outline'}>Insights</Btn> : null}
            {loaded && can('exports.run') ? <Btn size="sm" icon={Download} onPress={doExport}>Export</Btn> : null}
            <View style={{ flex: 1, minWidth: 150 }}>
              <Segment value={view} onChange={setView} options={[['board', 'Board'], ['list', 'List']]} />
            </View>
          </View>
        </View>

        {job ? <ManagedShortlist job={job} canRequest={loaded && can('support.request')} toast={toast} onShortlistShared={() => setTag('MZOBS shortlist')} /> : null}
        {job && insights ? <JobInsights jobId={job.id} /> : null}

        <View style={{ gap: 10 }}>
          <View>
            <Input value={q} onChangeText={setQ} placeholder="Search name, role or skill" accessibilityLabel="Search applicants" style={{ paddingLeft: 36 }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 12 }}><Search size={15} color={C.muted} /></View>
            {q ? <Press onPress={() => setQ('')} accessibilityLabel="Clear search" hitSlop={8} style={{ position: 'absolute', right: 10, top: 10 }}><X size={16} color={C.muted} /></Press> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Select style={{ flex: 1 }} value={owner} title="Owner" onChange={setOwner} options={[['', 'Any owner'], ['me', 'Assigned to me'], ['unassigned', 'Unassigned'], ...team.map((m) => [m.id, m.name])]} />
            <Select style={{ flex: 1 }} value={tag} title="Tag" onChange={setTag} options={[['', 'Any tag'], ...(tag && !allTags.includes(tag) ? [[tag, tag]] : []), ...allTags.map((t) => [t, t])]} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {view === 'list' ? <Select style={{ flex: 1 }} value={stageFilter} title="Stage" onChange={setStageFilter} options={[['', 'All stages'], ...PIPELINE.map((s) => [s.key, `${s.label} (${counts[s.key] ?? 0})`])]} /> : null}
            <Select style={{ flex: 1 }} value={sort} title="Sort" onChange={setSort} options={[['recent', 'Newest first'], ['oldest', 'Oldest first'], ['experience', 'Most experience'], ['name', 'Name A–Z'], ['followUp', 'Follow-up date']]} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <CheckBox checked={followUp} onChange={setFollowUp}>Follow-up due</CheckBox>
            {filtered ? <Press onPress={clearFilters} hitSlop={8}><T s={12.5} w="s" c={C.accent}>Clear filters</T></Press> : null}
          </View>
        </View>

        {selected.size > 0 && manage ? (
          <View accessibilityLabel="Bulk actions" style={[card, { padding: 12, gap: 10, borderColor: C.accent }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T s={13} w="b">{selected.size} selected</T>
              <Press onPress={() => setSelected(new Set())} accessibilityLabel="Clear selection" hitSlop={8}><X size={16} color={C.ink2} /></Press>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Select style={{ flex: 1 }} value="" disabled={busy} placeholder="Move to…" title="Move selected to stage" onChange={(v) => bulk({ stage: v }, `Moved ${selected.size} to ${STAGE_LABEL[v]}`)} options={MOVE_TARGETS.map((s) => [s.key, s.label])} />
              <Select style={{ flex: 1 }} value="" disabled={busy} placeholder="Assign to…" title="Assign selected to" onChange={(v) => bulk({ ownerId: v === 'none' ? null : v }, 'Owner updated')} options={[['none', 'Unassigned'], ...team.map((m) => [m.id, m.name])]} />
            </View>
            <Btn size="sm" icon={GitCompareArrows} disabled={!canCompare} onPress={() => setComparing(selectedItems.map((c) => c.id))} style={{ alignSelf: 'flex-start' }}>Compare</Btn>
            <T s={12} c={C.muted}>{canCompare ? 'Rejecting is done one at a time, so each gets a recorded reason.' : `${compareHint}. Rejecting is done one at a time, so each gets a recorded reason.`}</T>
          </View>
        ) : null}

        {error ? (
          <ErrorBlock message={error} onRetry={load} />
        ) : !data ? (
          <ListSkeleton rows={5} h={96} />
        ) : items.length === 0 ? (
          <EmptyState icon={Users} title={filtered ? 'No applicants match these filters' : 'No applicants yet'} body={filtered ? 'Try clearing a filter.' : 'Candidates appear here as they apply to your live jobs or MZOBS shares profiles with you.'} />
        ) : view === 'board' ? (
          <Board items={items} counts={counts} stage={stage} onStage={setStage} selected={selected} onSelect={toggle} onOpen={setOpenId} canManage={manage} showJob={jobId === 'all'} />
        ) : (
          <ApplicantList items={shown} selected={selected} onSelect={toggle} onSelectAll={selectAll} onOpen={setOpenId} canManage={manage} showJob={jobId === 'all'} />
        )}
        {data?.truncated ? <T s={12.5} c={C.muted}>Showing the first {items.length} of {data.total}. Use filters to narrow the list.</T> : null}
      </PageScroll>

      <ApplicantSheet
        id={openId}
        onClose={() => setOpenId(null)}
        onChanged={refresh}
        onReject={(c) => { setOpenId(null); afterSheet(() => setRejecting(c)) }}
        onSchedule={(c) => { setOpenId(null); afterSheet(() => setScheduling(c)) }}
        can={can}
        toast={toast}
      />
      <RejectSheet candidate={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); refresh() }} toast={toast} />
      <CompareSheet ids={comparing} onClose={() => setComparing(null)} />
      {scheduling ? <InterviewModal candidate={scheduling} onClose={() => setScheduling(null)} onScheduled={() => { setScheduling(null); refresh() }} /> : null}
    </Shell>
  )
}
