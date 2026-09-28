import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, RefreshControl, View } from 'react-native'
import { History, Radio, RefreshCw, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { Shell } from '../../components/web/Shell'
import SearchComposer from '../../components/web/SearchComposer'
import FilterPanel from '../../components/web/FilterPanel'
import CandidateCard from '../../components/web/CandidateCard'
import { useActions } from '../../components/web/useActions'
import { Btn, C, CardSkeleton, Chip, CheckBox, EmptyState, F, Input, Modal, Select, T, card } from '../../components/wk'
import { EMPTY_CRITERIA, SORTS, criteriaToChips, criteriaTitle, hasActiveCriteria, makeCriteria, removeChip } from '../../lib/talent/criteria'
import { parseQuery } from '../../lib/talent/parse'
import { collectTerms } from '../../lib/talent/boolean'
import { getPoolMeta, refreshPool, searchTalent } from '../../services/talent'
import { useWorkspace } from '../../store/workspace'
import { agoDate } from '../../lib/tfmt'
import { saveLastCriteria, saveLastResults } from '../../lib/lastSearch'

const PAGE = 20

function useDebounced(value, ms) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export default function SearchScreen({ route }) {
  const nav = useNavigation()
  const { recent, pushRecent, clearRecent, saveSearch, selected, selectMany, clearSelection, toast, messages, shortlists, viewed } = useWorkspace()
  const [criteria, setCriteria] = useState(() => makeCriteria(route.params?.criteria ?? {}))
  const [sort, setSort] = useState('relevance')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [meta, setMeta] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const req = useRef(0)

  // An unlock changes contact/pipeline fields, so re-run the search against the refreshed pool.
  const { onAction, host } = useActions(criteria, { onUnlocked: () => setCriteria((c) => ({ ...c })) })

  useEffect(() => {
    getPoolMeta().then(setMeta).catch(() => setMeta(null))
  }, [])
  const resync = async () => {
    setSyncing(true)
    try {
      setMeta(await refreshPool())
      setCriteria((c) => ({ ...c }))
      toast('Candidates refreshed')
    } catch {
      toast('Could not refresh — check your connection', { tone: 'warn' })
    } finally {
      setSyncing(false)
    }
  }

  // deep links (saved search / recent / job talent / Ask AI) hand criteria over via route params
  useEffect(() => {
    if (route.params?.criteria) setCriteria(makeCriteria(route.params.criteria))
  }, [route.params?.criteria, route.params?.nonce])

  const debounced = useDebounced(criteria, 280)
  // Candidates already acted on, for the "Already actioned" filters. Kept out of the criteria so saved searches stay portable.
  const hiddenViewed = debounced.hideViewed ? viewed : null
  const exclude = useMemo(() => {
    const ids = new Set()
    if (debounced.hideContacted) messages.forEach((x) => ids.add(x.candidateId))
    if (debounced.hideShortlisted) shortlists.forEach((l) => l.candidateIds.forEach((id) => ids.add(id)))
    if (hiddenViewed) Object.keys(hiddenViewed).forEach((id) => ids.add(id))
    return ids.size ? ids : null
  }, [debounced.hideContacted, debounced.hideShortlisted, messages, shortlists, hiddenViewed])
  useEffect(() => saveLastCriteria(debounced), [debounced])
  useEffect(() => {
    const id = ++req.current
    setLoading(true)
    setError(false)
    searchTalent(debounced, { sort, page: 1, pageSize: PAGE, exclude })
      .then((r) => {
        if (id !== req.current) return
        setRows(r.items)
        saveLastResults(r.ids)
        setTotal(r.total)
        setPage(1)
        setHasMore(r.hasMore)
      })
      .catch(() => id === req.current && setError(true))
      .finally(() => id === req.current && setLoading(false))
  }, [debounced, sort, exclude])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return
    const id = req.current
    setLoadingMore(true)
    searchTalent(debounced, { sort, page: page + 1, pageSize: PAGE, exclude })
      .then((r) => {
        if (id !== req.current) return
        setRows((x) => [...x, ...r.items])
        setPage(r.page)
        setHasMore(r.hasMore)
      })
      .finally(() => setLoadingMore(false))
  }, [loadingMore, hasMore, loading, debounced, sort, page, exclude])

  const runQuery = (text, mode, scope) => {
    const parsed = { ...parseQuery(text, mode), scope }
    setCriteria(parsed)
    if (hasActiveCriteria(parsed)) pushRecent(parsed)
  }

  const chips = useMemo(() => criteriaToChips(criteria), [criteria])
  const terms = useMemo(() => [...criteria.skills, ...criteria.keywords, ...criteria.keywordGroups.flat(), ...collectTerms(criteria.boolExpr)], [criteria])
  const active = hasActiveCriteria(criteria)
  const scored = rows.some((r) => r.match.overall != null)
  const pageIds = rows.map((r) => r.candidate.id)
  const allSelected = pageIds.length > 0 && pageIds.every((i) => selected.includes(i))
  const aiUnderstood = criteria.mode === 'ai' && criteria.q.trim() && chips.length > 0

  const openSave = () => {
    setSaveName(criteriaTitle(criteria))
    setSaveOpen(true)
  }
  // Keeps the search mode and scope, drops everything searched for.
  const clearAll = () => setCriteria({ ...EMPTY_CRITERIA, scope: criteria.scope, mode: criteria.mode })
  // Taking off the last filter also empties the search box — otherwise the old text stays there.
  const dropChip = (key) => {
    const next = removeChip(criteria, key)
    if (criteriaToChips(next).length === 0) next.q = ''
    setCriteria(next)
  }

  const filterPanel = <FilterPanel criteria={criteria} onChange={setCriteria} onSave={() => { setFiltersOpen(false); openSave() }} onClear={clearAll} meta={meta} />

  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <View style={{ gap: 6 }}>
        <T s={32} w="x" style={{ letterSpacing: -1, lineHeight: 37 }}>Search <T s={32} w="s" c={C.accent} style={{ fontFamily: F.i, fontStyle: 'italic' }}>candidates</T></T>
        <T s={14} c={C.muted}>Discover verified talent matched to your hiring requirements.</T>
      </View>
      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 10, minHeight: 34 }}>
        <Radio size={13} color={C.ok} />
        <T s={12} w="m" c={C.ink2}>Live · {meta ? `${meta.total} candidates` : 'connecting…'}</T>
        <Pressable onPress={resync} disabled={syncing} accessibilityLabel="Refresh candidates" hitSlop={8} style={{ opacity: syncing ? 0.5 : 1 }}>
          <RefreshCw size={12} color={C.muted} />
        </Pressable>
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: C.line }} />
        <Pressable onPress={() => nav.navigate('UnlockedCvs')} hitSlop={6}>
          <T s={12} w="m" c={C.accent}>Unlocked CVs</T>
        </Pressable>
      </View>

      <SearchComposer criteria={criteria} onSearch={runQuery} onClear={clearAll} canClear={active} loading={loading} />

      {chips.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: aiUnderstood ? C.aiLine : C.line, backgroundColor: aiUnderstood ? '#f2fbf9' : '#fff', paddingHorizontal: 14, paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {aiUnderstood ? <Sparkles size={13} color={C.accentText} /> : <SlidersHorizontal size={13} color={C.ink2} />}
            <T s={12.5} w="s" c={aiUnderstood ? C.accentText : C.ink2}>{aiUnderstood ? 'Mzobs understood your search' : 'Active filters'}</T>
          </View>
          {chips.map((c) => <Chip key={c.key} tone={aiUnderstood ? 'ai' : 'accent'} onRemove={() => dropChip(c.key)}>{c.label}</Chip>)}
          <Pressable onPress={clearAll} style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 6 }}>
            <X size={12} color={C.accent} />
            <T s={12.5} w="s" c={C.accent}>Clear all</T>
          </Pressable>
        </View>
      ) : null}

      {!active && recent.length > 0 ? (
        <View style={[card, { padding: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <History size={14} color={C.muted} />
              <T s={13} w="s">Recent searches</T>
            </View>
            <Pressable onPress={clearRecent} hitSlop={8}><T s={12} c={C.muted}>Clear</T></Pressable>
          </View>
          {recent.slice(0, 4).map((r, i) => (
            <View key={r.id} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2, gap: 4 }}>
              <T s={13} c={C.ink2} numberOfLines={1}>{criteriaTitle(r.criteria)} <T s={13} c={C.muted}>· {agoDate(r.at)}</T></T>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable onPress={() => setCriteria(makeCriteria({ ...r.criteria, q: r.criteria.q }))} style={{ minHeight: 34, justifyContent: 'center', paddingHorizontal: 8 }}><T s={12} w="m" c={C.accent}>Search profiles</T></Pressable>
                <Pressable onPress={() => { saveSearch(criteriaTitle(r.criteria), r.criteria, null); toast('Search saved') }} style={{ minHeight: 34, justifyContent: 'center', paddingHorizontal: 8 }}><T s={12} w="m" c={C.muted}>Save</T></Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 10, marginTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <CheckBox checked={allSelected} onChange={() => (allSelected ? clearSelection() : selectMany(pageIds))} style={{ marginTop: -4, width: 24 }} />
          <View style={{ flex: 1 }}>
            <T s={15} w="s">{loading && total == null ? 'Searching…' : `${(total ?? 0).toLocaleString('en-IN')} candidate${total === 1 ? '' : 's'} found`}</T>
            {scored && !loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} color={C.accentText} />
                <T s={12.5} c={C.accentText} style={{ flex: 1 }}>Mzobs AI ranked {total?.toLocaleString('en-IN')} candidate{total === 1 ? '' : 's'} against your requirements.</T>
              </View>
            ) : null}
            {!scored && !loading ? <T s={12.5} c={C.muted}>{chips.length ? 'Filtered by your search. Add skills, a role or location to rank by AI match.' : 'Showing all talent. Add skills, a role or location to rank by AI match.'}</T> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Btn icon={SlidersHorizontal} onPress={() => setFiltersOpen(true)}>{`Filters${chips.length > 0 ? ` (${chips.length})` : ''}`}</Btn>
          <Select value={sort} onChange={setSort} options={SORTS.map((s) => [s.id, s.label])} title="Sort by" style={{ flex: 1, minHeight: 40 }} />
        </View>
      </View>
    </View>
  )

  return (
    <Shell>
      <View style={{ flex: 1 }}>
        <FlatList
          data={error || loading ? [] : rows}
          keyExtractor={(r) => r.candidate.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 140, gap: 12 }}
          ListHeaderComponent={header}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={<RefreshControl refreshing={false} onRefresh={resync} tintColor={C.accent} colors={[C.accent]} />}
          ListEmptyComponent={
            error ? (
              <EmptyState icon={Search} title="Couldn't load candidates" body="Check your connection and try again." action={<Btn onPress={() => setCriteria({ ...criteria })}>Retry</Btn>} />
            ) : loading ? (
              <View style={{ gap: 12 }}>{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}</View>
            ) : (
              <EmptyState
                icon={Search}
                title={chips.length === 0 ? 'No candidates in the resume database yet' : 'No candidates match these filters'}
                body={chips.length === 0 ? 'Candidates appear here once job seekers with a verified CV join Mzobs.' : 'Try removing a filter or widening your experience range.'}
                action={chips.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>{chips.slice(0, 6).map((c) => <Chip key={c.key} tone="accent" onRemove={() => dropChip(c.key)}>{c.label}</Chip>)}</View> : null}
              />
            )
          }
          ListFooterComponent={loadingMore ? <CardSkeleton /> : !loading && !hasMore && rows.length > PAGE ? <T s={12.5} c={C.muted} style={{ textAlign: 'center', paddingVertical: 24 }}>You've reached the end of the results.</T> : null}
          renderItem={({ item }) => <CandidateCard row={item} terms={terms} onAction={onAction} />}
        />
        {host}
      </View>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" footer={<Btn variant="primary" onPress={() => setFiltersOpen(false)} style={{ flex: 1 }}>{`Show ${total ?? ''} candidates`}</Btn>}>
        {filterPanel}
      </Modal>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save this search"
        subtitle="Find it again in Saved Searches and turn on alerts for new candidates."
        footer={<><Btn onPress={() => setSaveOpen(false)}>Cancel</Btn><Btn variant="primary" disabled={!saveName.trim()} onPress={() => { saveSearch(saveName.trim(), criteria, total); setSaveOpen(false); toast('Search saved') }}>Save search</Btn></>}
      >
        <Input value={saveName} onChangeText={setSaveName} autoFocus accessibilityLabel="Search name" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>{chips.map((c) => <Chip key={c.key}>{c.label}</Chip>)}</View>
      </Modal>
    </Shell>
  )
}
