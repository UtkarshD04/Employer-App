import { useCallback, useState } from 'react'
import { Pressable, ScrollView, Share, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useNavigation } from '@react-navigation/native'
import { Bookmark, Download, FolderPlus, GitCompareArrows, Mail, MessageSquare, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspace } from '../../store/workspace'
import { getTalentMany } from '../../services/talent'
import { getResumeLink } from '../../services/talentApi'
import { RECRUITER_WEB_URL } from '../../services/jobsWeb'
import { isRevealed } from '../../lib/reveal'
import { C, Btn, T, shadowPop } from '../wk'
import { MatchSheet, TrustSheet } from './Sheets'
import { ResumeViewer } from './ResumeViewer'
import { AddToJobModal, InterviewModal, NoteModal, OutreachModal, ShortlistModal, UnlockModal, dial } from './ActionModals'
import CompareModal from './CompareModal'

/**
 * One place that wires every recruiter action (card menus, profile header, bulk bar) to its
 * sheet. Returns `onAction(type, payload, field)` plus the `host` element to render once per
 * screen. `onUnlocked(result)` runs after a CV credit is spent, so the screen can reload.
 */
export function useActions(criteria, { onUnlocked } = {}) {
  const nav = useNavigation()
  const { toast, selected, clearSelection, setCompareIds, compare } = useWorkspace()
  const [why, setWhy] = useState(null)
  const [trust, setTrust] = useState(null)
  const [shortlistIds, setShortlistIds] = useState([])
  const [jobIds, setJobIds] = useState([])
  const [outreach, setOutreach] = useState({ list: [], channel: 'email' })
  const [interview, setInterview] = useState(null)
  const [note, setNote] = useState({ c: null, kind: 'note' })
  const [compareOpen, setCompareOpen] = useState(false)
  const [unlock, setUnlock] = useState(null)
  const [resume, setResume] = useState(null)

  const onAction = useCallback(
    (type, payload, field) => {
      const c = payload?.candidate ?? payload
      switch (type) {
        case 'open': return nav.navigate('CandidateProfile', { id: c.id })
        case 'why': return setWhy(payload)
        case 'trust': return setTrust(payload)
        case 'shortlist': return setShortlistIds([c.id])
        case 'job': return setJobIds([c.id])
        // Writing to someone needs their email open — otherwise offer the reveal first.
        case 'contact': case 'email': return !isRevealed(c, 'email') ? setUnlock({ c, field: 'email' }) : setOutreach({ list: [c], channel: 'email' })
        case 'message': return setOutreach({ list: [c], channel: 'message' })
        // Texting needs the phone number opened first; then it goes out from the app.
        case 'sms': return !isRevealed(c, 'phone') ? setUnlock({ c, field: 'phone' }) : setOutreach({ list: [c], channel: 'sms' })
        // Call opens the phone's dialer with the number (once it has been viewed).
        case 'call':
          if (isRevealed(c, 'phone') && c.contact?.phone) {
            toast(`Opening your phone app to call ${c.name.split(' ')[0]}`)
            return dial(c.contact.phone)
          }
          return setUnlock({ c, field: 'phone' })
        case 'unlock': return setUnlock({ c, field: field ?? 'phone' })
        case 'resume':
          // Opens the CV when the plan or an earlier unlock allows it; otherwise offers the CV-credit unlock.
          return getResumeLink(c)
            .then((f) => setResume({ ...f, name: c.name }))
            .catch((e) => (e.code === 'LOCKED' ? setUnlock({ c, field: 'resume' }) : toast(e.code === 'NO_RESUME' ? `${c.name} has no verified CV yet.` : 'Could not open the CV — try again.', { tone: 'warn' })))
        case 'interview':
          // Interviews hang off a pipeline row, which a resume-database profile only gets when it's unlocked for a job.
          if (!c._live?.candidateId) {
            toast('View this candidate first — that adds them to your pipeline.', { tone: 'warn' })
            return setUnlock({ c, field: 'email' })
          }
          return setInterview(c)
        case 'note': return setNote({ c, kind: 'note' })
        case 'reminder': return setNote({ c, kind: 'reminder' })
        case 'share': {
          const url = `${RECRUITER_WEB_URL}/candidate/${c.id}`
          return Clipboard.setStringAsync(url).then(() => toast('Profile link copied'))
        }
        default:
      }
    },
    [nav, toast]
  )

  const bulk = useCallback(
    async (type) => {
      if (type === 'shortlist') return setShortlistIds(selected)
      if (type === 'job') return setJobIds(selected)
      if (type === 'compare') {
        if (selected.length < 2) return toast('Select at least 2 candidates to compare', { tone: 'warn' })
        setCompareIds(selected)
        return setCompareOpen(true)
      }
      if (type === 'export') {
        const rows = await getTalentMany(selected)
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const csv = [['Name', 'Designation', 'Company', 'Experience (yrs)', 'Location', 'Expected LPA', 'Notice (days)', 'Skills'].join(','), ...rows.map((r) => [r.name, r.designation, r.currentCompany, r.experienceYears, r.location, r.expectedSalaryLPA, r.noticePeriodDays, r.skills.join('; ')].map(esc).join(','))].join('\n')
        await Share.share({ title: 'mzobs-candidates.csv', message: csv }).catch(() => {})
        return toast(`Exported ${rows.length} candidates`)
      }
      const list = await getTalentMany(selected)
      setOutreach({ list, channel: type })
    },
    [selected, toast, setCompareIds]
  )

  const host = (
    <>
      <MatchSheet row={why} onClose={() => setWhy(null)} />
      <TrustSheet row={trust} onClose={() => setTrust(null)} />
      <ShortlistModal ids={shortlistIds} onClose={(ok) => { setShortlistIds([]); if (ok) clearSelection() }} />
      <AddToJobModal ids={jobIds} onClose={() => setJobIds([])} />
      <OutreachModal candidates={outreach.list} channel={outreach.channel} onClose={() => setOutreach({ list: [], channel: 'email' })} onReveal={(c, part) => { setOutreach({ list: [], channel: 'email' }); setUnlock({ c, field: part }) }} />
      <UnlockModal
        candidate={unlock?.c ?? null}
        field={unlock?.field}
        onClose={() => setUnlock(null)}
        onUnlocked={onUnlocked}
        onViewResume={(c, f) => { setUnlock(null); setResume({ ...f, name: c.name }) }}
        onCompose={(c, contact, channel = 'email') => {
          setUnlock(null)
          // The reveal just created the pipeline row, so carry its id and the opened parts along — sending needs both.
          setOutreach({ list: [{ ...c, contact, _live: { ...c._live, candidateId: contact.candidateId ?? c._live?.candidateId, unlocked: true, revealed: contact.revealed ?? c._live?.revealed } }], channel })
        }}
      />
      <ResumeViewer file={resume} onClose={() => setResume(null)} />
      <InterviewModal candidate={interview} onClose={() => setInterview(null)} />
      <NoteModal candidate={note.c} kind={note.kind} onClose={() => setNote({ c: null, kind: 'note' })} />
      <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} criteria={criteria} onOpenProfile={(id) => nav.navigate('CandidateProfile', { id })} />
      <CompareTray count={compare.length} onOpen={() => setCompareOpen(true)} />
      <SelectionBar onBulk={bulk} />
    </>
  )
  return { onAction, host }
}

function CompareTray({ count, onOpen }) {
  const { clearCompare, selected } = useWorkspace()
  const insets = useSafeAreaInsets()
  if (count === 0 || selected.length > 0) return null
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 4, alignItems: 'center' }}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: C.ink, paddingHorizontal: 12, paddingVertical: 8 }, shadowPop]}>
        <GitCompareArrows size={15} color="#fff" />
        <T s={13} c="#fff">{count} to compare</T>
        <Btn size="sm" variant="ai" disabled={count < 2} onPress={onOpen}>Compare</Btn>
        <Pressable onPress={clearCompare} hitSlop={10} accessibilityLabel="Clear compare"><X size={15} color="rgba(255,255,255,0.7)" /></Pressable>
      </View>
    </View>
  )
}

function SelectionBar({ onBulk }) {
  const { selected, clearSelection } = useWorkspace()
  const insets = useSafeAreaInsets()
  if (!selected.length) return null
  const item = (Icon, label, k) => (
    <Pressable key={k} onPress={() => onBulk(k)} style={{ height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 12 }}>
      <Icon size={14} color="rgba(255,255,255,0.9)" />
      <T s={13} w="m" c="rgba(255,255,255,0.9)">{label}</T>
    </Pressable>
  )
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12), paddingHorizontal: 12 }}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: C.ink, padding: 6, paddingLeft: 16 }, shadowPop]}>
        <T s={13} w="s" c="#fff" style={{ marginRight: 8 }}>{selected.length} selected</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
          {item(Bookmark, 'Shortlist', 'shortlist')}
          {item(FolderPlus, 'Add to job', 'job')}
          {item(MessageSquare, 'Message', 'message')}
          {item(Mail, 'Email', 'email')}
          {item(GitCompareArrows, 'Compare', 'compare')}
          {item(Download, 'Export', 'export')}
        </ScrollView>
        <Pressable onPress={clearSelection} hitSlop={8} accessibilityLabel="Clear selection" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><X size={15} color="#fff" /></Pressable>
      </View>
    </View>
  )
}
