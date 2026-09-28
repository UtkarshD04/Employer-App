import { useEffect, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Activity, ArrowLeft, Award, Bookmark, Briefcase, Building2, CalendarPlus, ChevronLeft, ChevronRight, Clock, Database, ExternalLink, Eye, FileText, FolderPlus, GitCompareArrows, GraduationCap, IndianRupee, Languages, Lightbulb, Lock, Mail, MapPin, MessageSquare, Phone, Pin, Share2, Sparkles, StickyNote } from 'lucide-react-native'
import * as WebBrowser from 'expo-web-browser'
import { useNavigation } from '@react-navigation/native'
import { Shell } from '../../components/web/Shell'
import { useActions } from '../../components/web/useActions'
import { NotesList } from '../../components/web/ActionModals'
import { ResumeFrame, ResumeLinks } from '../../components/web/ResumeViewer'
import { Avatar, Banner, Btn, C, Chip, EmptyState, F, Input, MatchBadge, SectionCard, Sheet, Skeleton, StatusPill, T, TrustScore, VerifiedBadge, Press } from '../../components/wk'
import { findSimilar, getTalent } from '../../services/talent'
import { getResumeLink, setCandidateStage } from '../../services/talentApi'
import { STAGES, STAGE_LABELS } from '../../lib/talent/criteria'
import { MATCH_LABELS, computeMatch, computeTrust } from '../../lib/talent/engine'
import { loadLastCriteria, loadLastResults } from '../../lib/lastSearch'
import { useWorkspace } from '../../store/workspace'
import { agoDays, lpa, notice, years } from '../../lib/tfmt'
import { creditSpent, isRevealed } from '../../lib/reveal'

// Email and phone are opened one at a time: each has its own View button. The first one opened
// costs 1 credit for the candidate; the other is then free.
function ContactFact({ candidate: c, onView }) {
  const preview = c._live?.contactPreview
  const paid = creditSpent(c)
  const line = (part, value, masked) =>
    isRevealed(c, part) ? (
      <T s={14} w="m">{value || '—'}</T>
    ) : (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <T s={14} c={C.ink2}>{masked ?? '—'}</T>
        <Press onPress={() => onView(part)} scale={0.95} style={{ minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, borderWidth: 1, borderColor: C.line, paddingHorizontal: 8 }}>
          <Eye size={12} color={C.accent} />
          <T s={12} w="s" c={C.accent}>{paid ? 'View · free' : 'View · 1 credit'}</T>
        </Press>
      </View>
    )
  return <View style={{ gap: 8 }}>{line('email', c.contact?.email, preview?.email)}{line('phone', c.contact?.phone, preview?.phone)}</View>
}

function Fact({ icon: Icon, label, children, width = '47%' }) {
  return (
    <View style={{ width }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon size={12} color={C.muted} />
        <T s={11.5} w="m" c={C.muted} style={{ letterSpacing: 0.4 }}>{label.toUpperCase()}</T>
      </View>
      <View style={{ marginTop: 2 }}>{typeof children === 'string' ? <T s={14} w="m">{children}</T> : children}</View>
    </View>
  )
}

function Timeline({ history }) {
  if (!history.length) return <T s={13} c={C.muted}>No work history on this profile.</T>
  return (
    <View style={{ marginLeft: 8, borderLeftWidth: 2, borderLeftColor: C.line2, paddingLeft: 22, gap: 24 }}>
      {history.map((w, i) => (
        <View key={`${w.company}-${i}`}>
          <View style={{ position: 'absolute', left: -31, top: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff', backgroundColor: i === 0 ? C.accent : '#c5c9d8' }} />
          <T s={12} w="m" c={C.muted}>{w.startYear ?? '—'} — {w.endYear ?? 'Present'}</T>
          <T s={15} w="s">{w.role}</T>
          <T s={13.5} c={C.ink2}>{w.company}{w.location ? ` · ${w.location}` : ''}</T>
          {w.skills?.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{w.skills.map((s) => <Chip key={s}>{s}</Chip>)}</View> : null}
        </View>
      ))}
    </View>
  )
}

// The attached CV, shown inline like a job board's resume view. It loads as soon as the plan or
// an unlock allows; until then it's a locked placeholder.
function CvSection({ candidate: c, onUnlock }) {
  const [cv, setCv] = useState({ status: 'loading' })
  useEffect(() => {
    // A database profile whose CV this company hasn't opened can't have a CV link — skip the request.
    if (c._live?.kind === 'resdex' && !isRevealed(c, 'resume')) return setCv({ status: 'locked' })
    let live = true
    setCv({ status: 'loading' })
    getResumeLink(c)
      .then((f) => live && setCv({ status: 'ready', ...f }))
      .catch((e) => live && setCv({ status: e.code === 'LOCKED' ? 'locked' : e.code === 'NO_RESUME' ? 'none' : 'error' }))
    return () => {
      live = false
    }
  }, [c])

  return (
    <SectionCard title="CV">
      {cv.status === 'ready' ? <View style={{ marginBottom: 12 }}><ResumeLinks url={cv.url} /></View> : null}
      {cv.status === 'loading' ? <Skeleton h={300} r={12} /> : null}
      {cv.status === 'ready' ? <ResumeFrame url={cv.url} fileName={cv.fileName} height={520} /> : null}
      {cv.status === 'locked' ? (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
          <View style={{ padding: 20, gap: 10, opacity: 0.5 }}>
            {[70, 45, 90, 80, 60, 85, 40].map((w, i) => <View key={i} style={{ height: 10, borderRadius: 4, backgroundColor: C.line2, width: `${w}%` }} />)}
          </View>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)', padding: 12 }}>
            <View style={{ maxWidth: 300, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Lock size={14} color={C.ink} /><T s={14} w="s">CV is locked</T></View>
              <T s={13} c={C.muted} style={{ textAlign: 'center', marginTop: 4 }}>{creditSpent(c) ? `You have already used the credit for ${c.name.split(' ')[0]} — viewing the CV is free.` : `Viewing ${c.name.split(' ')[0]}'s CV uses 1 credit — once. Email and phone open separately, and are then free.`}</T>
              <Btn variant="primary" size="sm" icon={Eye} onPress={onUnlock} style={{ marginTop: 12 }}>{creditSpent(c) ? 'View CV · free' : 'View CV · 1 credit'}</Btn>
            </View>
          </View>
        </View>
      ) : null}
      {cv.status === 'none' ? <T s={13} c={C.muted}>No verified CV on this profile yet.</T> : null}
      {cv.status === 'error' ? <T s={13} c={C.muted}>Couldn't load the CV. Reopen the profile to try again.</T> : null}
    </SectionCard>
  )
}

export default function CandidateProfileScreen({ route }) {
  const { id } = route.params
  const nav = useNavigation()
  const criteria = useMemo(() => loadLastCriteria(), [])
  const results = useMemo(() => loadLastResults(), [])
  const { notes, shortlists, savedIds, toggleSaved, compare, toggleCompare, markViewed, toast } = useWorkspace()
  const [c, setC] = useState(undefined)
  const [similar, setSimilar] = useState(null)
  const [stageBusy, setStageBusy] = useState(false)
  const [reject, setReject] = useState(null) // reason text while the reject sheet is open

  const reload = () => getTalent(id).then((x) => setC(x ?? null))
  const { onAction, host } = useActions(criteria, { onUnlocked: reload })
  const moveStage = async (stage, reason) => {
    setStageBusy(true)
    try {
      await setCandidateStage(c._live.candidateId, stage, reason)
      toast(`Moved to ${STAGE_LABELS[stage]}`)
      await reload()
    } catch (e) {
      toast(e.response?.data?.message ?? 'Could not update the stage', { tone: 'warn' })
    } finally {
      setStageBusy(false)
    }
  }

  useEffect(() => {
    setC(undefined)
    setSimilar(null)
    getTalent(id).then((x) => setC(x ?? null))
    findSimilar(id).then(setSimilar)
  }, [id])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (c) markViewed(c.id) }, [c?.id])

  const match = useMemo(() => (c ? computeMatch(c, criteria) : null), [c, criteria])
  const trust = useMemo(() => (c ? computeTrust(c) : null), [c])

  if (c === undefined)
    return (
      <Shell>
        <View style={{ padding: 16, gap: 16 }}><Skeleton h={180} r={16} /><Skeleton h={280} r={16} /></View>
      </Shell>
    )
  if (c === null)
    return (
      <Shell>
        <EmptyState title="Candidate not found" body="They may have been removed from the pool." action={<Btn onPress={() => nav.navigate('Search')}>Back to search</Btn>} />
      </Shell>
    )

  const row = { candidate: c, match, trust }
  const pos = results.indexOf(c.id)
  const prevId = pos > 0 ? results[pos - 1] : null
  const nextId = pos >= 0 && pos < results.length - 1 ? results[pos + 1] : null
  // replace: stepping through results shouldn't stack history, so Back still returns to the list.
  const step = (to) => nav.replace('CandidateProfile', { id: to })
  const inList = shortlists.some((l) => l.candidateIds.includes(c.id))
  const bookmarked = savedIds.includes(c.id)
  const scoredParts = Object.entries(match.parts).filter(([, v]) => v != null)

  const recommended = [
    c.noticePeriodDays != null && c.noticePeriodDays <= 30 && { text: `Available within ${notice(c.noticePeriodDays)} — reach out early.`, act: ['Contact', () => onAction('contact', c)] },
    trust.rows.find((r) => r.key === 'employment')?.status !== 'verified' && { text: 'Employment history is not verified yet — confirm during screening.', act: ['Add note', () => onAction('note', c)] },
    !inList && { text: 'Not in any shortlist yet.', act: ['Shortlist', () => onAction('shortlist', c)] },
  ].filter(Boolean)

  const actions = [
    { label: 'Contact', icon: Mail, primary: true, run: () => onAction('contact', c) },
    { label: 'Call', icon: Phone, run: () => onAction('call', c) },
    { label: 'Message', icon: MessageSquare, run: () => onAction('message', c) },
    { label: 'Schedule interview', icon: CalendarPlus, run: () => onAction('interview', c) },
    { label: inList ? 'Shortlisted' : 'Shortlist', icon: Bookmark, run: () => onAction('shortlist', c), on: inList },
    { label: 'Add to job', icon: FolderPlus, run: () => onAction('job', c) },
    { label: bookmarked ? 'Saved' : 'Save', icon: Pin, run: () => toggleSaved(c.id), on: bookmarked },
  ]
  const kv = { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 16 }

  return (
    <Shell>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 120, gap: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Press onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('Search'))} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={14} color={C.muted} />
              <T s={13} w="m" c={C.muted}>Back to results</T>
            </Press>
            {pos >= 0 && results.length > 1 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Btn size="sm" variant="ghost" icon={ChevronLeft} disabled={!prevId} onPress={() => step(prevId)}>Previous</Btn>
                <T s={12.5} c={C.muted}>{(pos + 1).toLocaleString('en-IN')} of {results.length.toLocaleString('en-IN')}</T>
                <Btn size="sm" variant="ghost" disabled={!nextId} onPress={() => step(nextId)} iconRight={ChevronRight}>Next</Btn>
              </View>
            ) : null}
          </View>

          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', padding: 20 }}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Avatar candidate={c} size={68} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <T s={24} w="b" style={{ letterSpacing: -0.4 }}>{c.name}</T>
                  <VerifiedBadge candidate={c} />
                  {c._live?.kind === 'resdex' ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: C.line2, paddingHorizontal: 6, paddingVertical: 2 }}><Database size={11} color={C.ink2} /><T s={11} w="s" c={C.ink2}>Resume database</T></View> : null}
                </View>
                <T s={15} c={C.ink2} style={{ marginTop: 2 }}>{c.designation}{c.currentCompany ? <T s={15} c={C.muted}> at </T> : null}{c.currentCompany}</T>
              </View>
            </View>
            <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MapPin size={13} color={C.muted} /><T s={13} c={C.muted}>{c.location || '—'}</T></View>
              {c.companyType ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Building2 size={13} color={C.muted} /><T s={13} c={C.muted}>{c.companyType}</T></View> : null}
              {c.lastActiveDaysAgo != null ? <T s={13} c={C.muted}>Active {agoDays(c.lastActiveDaysAgo)}</T> : c.sharedDaysAgo != null ? <T s={13} c={C.muted}>Shared with you {agoDays(c.sharedDaysAgo)}</T> : null}
              {c.resumeUpdatedDaysAgo != null ? <T s={13} c={C.muted}>Resume updated {agoDays(c.resumeUpdatedDaysAgo)}</T> : null}
              {c.jobTitle ? <T s={13} c={C.muted}>For {c.jobTitle}</T> : null}
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <MatchBadge score={match.overall} onPress={() => onAction('why', row)} />
              <TrustScore score={trust.score} onPress={() => onAction('trust', row)} />
            </View>
            <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 16 }}>
              {actions.map((a) => <Btn key={a.label} variant={a.primary ? 'primary' : 'outline'} icon={a.icon} onPress={a.run} style={undefined} textStyle={a.on ? { color: '#1a8f5a' } : undefined}>{a.label}</Btn>)}
              <Btn icon={GitCompareArrows} onPress={() => toggleCompare(c.id)}>{compare.includes(c.id) ? 'In compare' : 'Compare'}</Btn>
              <Btn icon={isRevealed(c, 'resume') ? FileText : Lock} onPress={() => onAction('resume', c)}>View CV</Btn>
              <Btn variant="ghost" icon={Share2} onPress={() => onAction('share', c)}>Share</Btn>
              {c._live?.candidateId ? <Btn icon={FileText} onPress={() => nav.navigate('CreateOffer', { candidate: { id: c._live.candidateId, name: c.name, role: c.designation, jobId: c.jobId } })}>Send offer</Btn> : null}
            </View>
            {c._live?.candidateId ? (
              <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 16 }}>
                <T s={12} w="m" c={C.muted} style={{ letterSpacing: 0.6 }}>PIPELINE</T>
                {STAGES.map((st) => (
                  <Press key={st} disabled={stageBusy || c.stage === st} scale={0.95} onPress={() => (st === 'rejected' ? setReject('') : moveStage(st))} style={{ minHeight: 34, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: c.stage === st ? C.accent : C.line, backgroundColor: c.stage === st ? C.accentSoft : '#fff', paddingHorizontal: 12, opacity: stageBusy && c.stage !== st ? 0.5 : 1 }}>
                    <T s={12.5} w="m" c={c.stage === st ? C.accentText : C.ink2}>{STAGE_LABELS[st]}</T>
                  </Press>
                ))}
                {c.stage === 'rejected' && c.rejectionReason ? <T s={12.5} c={C.muted}>Reason: {c.rejectionReason}</T> : null}
              </View>
            ) : null}
          </View>

          <SectionCard title="Professional summary">
            <T s={14} c={C.ink2} style={{ lineHeight: 22 }}>{c.summary || 'No summary provided.'}</T>
            <View style={[kv, { marginTop: 20 }]}>
              <Fact icon={Briefcase} label="Experience">{years(c.experienceYears)}</Fact>
              <Fact icon={Mail} label="Contact" width="100%"><ContactFact candidate={c} onView={(part) => onAction('unlock', c, part)} /></Fact>
              {c.currentSalaryLPA != null ? <Fact icon={IndianRupee} label="Current CTC">{lpa(c.currentSalaryLPA)}</Fact> : null}
              <Fact icon={IndianRupee} label="Expected CTC">{lpa(c.expectedSalaryLPA)}</Fact>
              {c.noticePeriodDays != null ? <Fact icon={Clock} label="Notice period">{notice(c.noticePeriodDays)}</Fact> : null}
            </View>
            {c.links?.length > 0 ? (
              <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {c.links.map((l) => (
                  <Press key={l.label} onPress={() => WebBrowser.openBrowserAsync(l.url)} style={{ minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, borderColor: C.line, paddingHorizontal: 10 }}>
                    <ExternalLink size={12} color={C.blue} />
                    <T s={12.5} w="m" c={C.blue}>{l.label}</T>
                  </Press>
                ))}
              </View>
            ) : null}
          </SectionCard>

          <CvSection candidate={c} onUnlock={() => onAction('resume', c)} />

          <SectionCard title="Experience"><Timeline history={c.workHistory} /></SectionCard>

          <SectionCard title="Skills">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {c.skills.map((s) => <Chip key={s} tone={match.strong.some((m) => m.toLowerCase() === s.toLowerCase()) ? 'hit' : 'neutral'}>{s}</Chip>)}
            </View>
            {match.weak.length > 0 ? <T s={12.5} c={C.muted} style={{ marginTop: 12 }}>Not listed for your search: {match.weak.join(', ')}</T> : null}
          </SectionCard>

          {c.projects.length > 0 ? (
            <SectionCard title="Projects">
              <View style={{ gap: 16 }}>
                {c.projects.map((p) => (
                  <View key={p.name}>
                    <T s={14} w="s">{p.name}</T>
                    <T s={13.5} c={C.ink2}>{p.description}</T>
                    {p.tech?.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>{p.tech.map((t) => <Chip key={t}>{t}</Chip>)}</View> : null}
                  </View>
                ))}
              </View>
            </SectionCard>
          ) : null}

          <SectionCard title="Education">
            <View style={{ gap: 12 }}>
              {c.education.length ? c.education.map((e, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  <GraduationCap size={16} color={C.muted} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <T s={14} w="m">{e.degree}</T>
                    <T s={13} c={C.muted}>{e.institute}{e.year ? ` · ${e.year}` : ''}</T>
                  </View>
                </View>
              )) : <T s={13} c={C.muted}>Not provided.</T>}
            </View>
          </SectionCard>

          <SectionCard title="Certifications & languages">
            <View style={{ gap: 8 }}>
              {c.certifications.map((x) => <View key={x} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Award size={15} color={C.muted} /><T s={13.5} style={{ flex: 1 }}>{x}</T></View>)}
              {c.certifications.length === 0 ? <T s={13} c={C.muted}>No certifications listed.</T> : null}
              {c.languages.length > 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 }}><Languages size={15} color={C.muted} /><T s={13.5}>{c.languages.join(', ')}</T></View> : null}
            </View>
          </SectionCard>

          <SectionCard title="Preferences & availability">
            <View style={kv}>
              <Fact icon={MapPin} label="Preferred locations" width="100%">{c.preferredLocations.join(', ') || '—'}</Fact>
              <Fact icon={Building2} label="Work mode">{c.workMode || '—'}</Fact>
              <Fact icon={Briefcase} label="Employment">{c.employmentType || '—'}</Fact>
            </View>
          </SectionCard>

          <SectionCard title="Verification">
            {trust.rows.map((r, i) => (
              <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
                <View style={{ flex: 1 }}>
                  <T s={13.5} w="m">{r.label}</T>
                  {r.detail ? <T s={12} c={C.muted}>{r.detail}</T> : null}
                </View>
                <StatusPill status={r.status} />
              </View>
            ))}
          </SectionCard>

          <SectionCard title="AI match analysis" action={<Sparkles size={15} color={C.ai} />}>
            {scoredParts.length === 0 ? (
              <T s={13} c={C.muted}>Run a search with skills, role or location and this panel will explain how {c.name.split(' ')[0]} fits.</T>
            ) : (
              <View style={{ gap: 10 }}>
                {scoredParts.map(([k, v]) => (
                  <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <T s={12.5} c={C.ink2} style={{ width: 100 }}>{MATCH_LABELS[k]}</T>
                    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.line2, overflow: 'hidden' }}><View style={{ height: 6, borderRadius: 3, width: `${v}%`, backgroundColor: v >= 85 ? C.ai : v >= 65 ? C.blue : C.amber }} /></View>
                    <T s={12.5} w="b" style={{ width: 36, textAlign: 'right' }}>{v}%</T>
                  </View>
                ))}
                <Btn size="sm" onPress={() => onAction('why', row)}>Full explanation</Btn>
              </View>
            )}
          </SectionCard>

          <SectionCard title={`Candidates similar to ${c.name.split(' ')[0]}`}>
            {similar === null ? <View style={{ gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={40} />)}</View> : (
              <View style={{ gap: 4 }}>
                {similar.map((s, i) => (
                  <Press key={s.candidate.id} scale={0.98} onPress={() => step(s.candidate.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, padding: 8 }}>
                    <T s={12} c={C.muted} style={{ width: 14 }}>{i + 1}</T>
                    <Avatar candidate={s.candidate} size={32} />
                    <View style={{ flex: 1 }}>
                      <T s={13.5} w="m" numberOfLines={1}>{s.candidate.name}</T>
                      <T s={12} c={C.muted} numberOfLines={1}>{s.candidate.designation} · {years(s.candidate.experienceYears)}</T>
                    </View>
                    <T s={12.5} w="s" c={C.accentText}>{s.score}%</T>
                  </Press>
                ))}
              </View>
            )}
            <T s={11.5} c={C.muted} style={{ marginTop: 8 }}>Based on skills, role, experience, industry, location and salary.</T>
          </SectionCard>

          <SectionCard title="Recommended actions" action={<Lightbulb size={15} color={C.warn} />}>
            {recommended.length === 0 ? <T s={13} c={C.muted}>Nothing pending for this candidate.</T> : (
              <View style={{ gap: 12 }}>
                {recommended.map((r) => (
                  <View key={r.text} style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <T s={13} c={C.ink2} style={{ flex: 1 }}>{r.text}</T>
                    <Btn size="sm" onPress={r.act[1]}>{r.act[0]}</Btn>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          <SectionCard title="Recruiter notes" action={<Press onPress={() => onAction('note', c)} style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4 }}><StickyNote size={13} color={C.accent} /><T s={12.5} w="m" c={C.accent}>Add</T></Press>}>
            <NotesList notes={notes[c.id]} />
          </SectionCard>

          <SectionCard title="Candidate activity" action={<Activity size={15} color={C.muted} />}>
            <View style={{ gap: 8 }}>
              {c.lastActiveDaysAgo != null ? <T s={13} c={C.ink2}>Last active {agoDays(c.lastActiveDaysAgo)}</T> : c.sharedDaysAgo != null ? <T s={13} c={C.ink2}>Shared with you {agoDays(c.sharedDaysAgo)}</T> : null}
              {c.resumeUpdatedDaysAgo != null ? <T s={13} c={C.ink2}>Resume updated {agoDays(c.resumeUpdatedDaysAgo)}</T> : null}
              <T s={13} c={C.ink2}>Profile {c.profileCompleteness}% complete</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><ExternalLink size={12} color={C.muted} /><T s={13} c={C.muted}>Source: {c.source}</T></View>
            </View>
          </SectionCard>
        </ScrollView>
        {host}
      </View>

      <Sheet open={reject !== null} onClose={() => setReject(null)} title="Reject this candidate?" subtitle={c.name} footer={<><Btn onPress={() => setReject(null)}>Cancel</Btn><Btn variant="primary" onPress={() => { const reason = reject.trim(); setReject(null); moveStage('rejected', reason || undefined) }}>Reject</Btn></>}>
        <Input value={reject ?? ''} onChangeText={setReject} multiline placeholder="Reason for rejecting (optional)" />
      </Sheet>
    </Shell>
  )
}
