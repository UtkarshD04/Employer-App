import { memo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Bookmark, BellRing, Briefcase, Building2, Check, Clock, Eye, FileText, FolderPlus, GitCompareArrows, GraduationCap, IndianRupee, Lock, Mail, MapPin, MessageSquare, MoreHorizontal, Phone, Pin, CalendarPlus, Send, Share2, StickyNote, Unlock } from 'lucide-react-native'
import { useWorkspace } from '../../store/workspace'
import { STAGE_LABELS } from '../../lib/talent/criteria'
import { agoDays, agoDate, lpa, notice, years } from '../../lib/tfmt'
import { creditSpent, isRevealed } from '../../lib/reveal'
import { Avatar, Btn, C, CheckBox, Chip, Highlight, MatchBadge, Sheet, Tag, T, TrustScore, VerifiedBadge, card } from '../wk'

const MORE_ACTIONS = [
  { id: 'job', label: 'Add to job', icon: FolderPlus },
  { id: 'message', label: 'Send message', icon: MessageSquare },
  { id: 'email', label: 'Send email', icon: Mail },
  { id: 'sms', label: 'Send SMS', icon: Send },
  { id: 'call', label: 'Call', icon: Phone },
  { id: 'interview', label: 'Schedule interview', icon: CalendarPlus },
  { id: 'reminder', label: 'Set reminder', icon: BellRing },
  { id: 'note', label: 'Add note', icon: StickyNote },
  { id: 'resume', label: 'View CV', icon: FileText },
  { id: 'share', label: 'Share profile', icon: Share2 },
]

function Meta({ icon: Icon, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
      <Icon size={13} color={C.icon} />
      <T s={13} c={C.ink2} style={{ flexShrink: 1 }}>{children}</T>
    </View>
  )
}

function CandidateCard({ row, terms, onAction }) {
  const { candidate: c, match, trust } = row
  const { selected, toggleSelect, compare, toggleCompare, savedIds, toggleSaved, viewed, shortlists } = useWorkspace()
  const [menu, setMenu] = useState(false)
  const isSel = selected.includes(c.id)
  const inCompare = compare.includes(c.id)
  const inList = shortlists.some((l) => l.candidateIds.includes(c.id))
  const strong = new Set(match.strong.map((s) => s.toLowerCase()))
  const skills = [...c.skills].sort((a, b) => Number(strong.has(b.toLowerCase())) - Number(strong.has(a.toLowerCase())))
  const shown = skills.slice(0, 8)
  const bookmarked = savedIds.includes(c.id)
  const cvOpen = isRevealed(c, 'resume')

  return (
    <View style={[card, { padding: 16, borderColor: isSel ? C.accent : C.line, backgroundColor: isSel ? '#f3fbf9' : '#fff' }]}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <CheckBox checked={isSel} onChange={() => toggleSelect(c.id)} style={{ marginTop: 6, minHeight: 32, width: 22 }} />
        <Avatar candidate={c} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <Pressable onPress={() => onAction('open', c)} style={{ flexShrink: 1 }}>
              <Highlight text={c.name} terms={terms} style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: C.ink }} />
            </Pressable>
            <VerifiedBadge candidate={c} />
            {creditSpent(c) ? <Tag icon={Unlock} bg={C.okSoft} fg={C.okText}>{cvOpen ? 'CV unlocked' : 'Credit used'}</Tag> : null}
            {viewed[c.id] ? <Tag icon={Eye}>Viewed</Tag> : null}
            <Pressable onPress={() => toggleSaved(c.id)} hitSlop={10} accessibilityLabel={bookmarked ? 'Unsave candidate' : 'Save candidate'}>
              <Pin size={14} color={bookmarked ? C.accent : C.muted} fill={bookmarked ? C.accent : 'none'} />
            </Pressable>
          </View>
          <T s={14} c={C.ink2} style={{ marginTop: 2 }}>
            <Highlight text={c.designation} terms={terms} style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.ink2 }} />
            {c.currentCompany ? <T s={14} c={C.muted}> at </T> : null}
            {c.currentCompany ? <Highlight text={c.currentCompany} terms={terms} style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.ink2 }} /> : null}
          </T>
          <View style={{ marginTop: 8, alignSelf: 'flex-start' }}><MatchBadge score={match.overall} onPress={() => onAction('why', row)} /></View>
        </View>
      </View>

      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 }}>
        <Meta icon={Briefcase}>{years(c.experienceYears)}</Meta>
        {c.expectedSalaryLPA != null ? <Meta icon={IndianRupee}>{c.currentSalaryLPA != null ? `${lpa(c.currentSalaryLPA)} → ` : 'Expects '}{lpa(c.expectedSalaryLPA)}</Meta> : null}
        <Meta icon={MapPin}>{c.location || '—'}</Meta>
        {c.noticePeriodDays != null ? <Meta icon={Clock}>{notice(c.noticePeriodDays)} notice</Meta> : null}
        {c.contact?.phone ? (
          <Meta icon={Phone}>{c.contact.phone}</Meta>
        ) : c._live?.contactPreview?.phone ? (
          <Pressable onPress={() => onAction('unlock', c, 'phone')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24 }}>
            <Phone size={13} color={C.icon} />
            <T s={13} c={C.ink2}>{c._live.contactPreview.phone}</T>
            <Eye size={12} color={C.accent} />
            <T s={13} w="s" c={C.accent}>View</T>
          </Pressable>
        ) : null}
        {c.education[0] ? <Meta icon={GraduationCap}>{c.education[0].degree}{c.education[0].institute ? `, ${c.education[0].institute}` : ''}</Meta> : null}
      </View>

      {c.preferredLocations.length > 0 ? (
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Building2 size={12} color={C.muted} />
          <T s={12.5} c={C.muted} style={{ flex: 1 }}>Prefers: {c.preferredLocations.join(' · ')}</T>
        </View>
      ) : null}

      <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        {shown.map((s) => <Chip key={s} tone={strong.has(s.toLowerCase()) ? 'hit' : 'neutral'}>{s}</Chip>)}
        {skills.length > shown.length ? <T s={12} c={C.muted}>+{skills.length - shown.length} more</T> : null}
      </View>

      <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4 }}>
          <TrustScore score={trust.score} onPress={() => onAction('trust', row)} />
          {c.resumeUpdatedDaysAgo != null ? <T s={12} c={C.muted}>Resume updated {agoDays(c.resumeUpdatedDaysAgo)}</T> : null}
          {c.lastActiveDaysAgo != null ? <T s={12} c={C.muted}>Active {agoDays(c.lastActiveDaysAgo)}</T> : c.sharedDaysAgo != null ? <T s={12} c={C.muted}>Shared {agoDays(c.sharedDaysAgo)}</T> : null}
          {c.stage ? <Tag fg={C.ink2}>{STAGE_LABELS[c.stage] ?? c.stage}</Tag> : null}
          {c.jobTitle ? <T s={12} c={C.muted} numberOfLines={1} style={{ maxWidth: 200 }}>for {c.jobTitle}</T> : null}
          <T s={12} c={C.muted}>{c.profileCompleteness}% complete</T>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Btn size="sm" onPress={() => onAction('open', c)}>View profile</Btn>
          <Btn size="sm" icon={cvOpen ? FileText : Lock} onPress={() => onAction('resume', c)}>View CV</Btn>
          <Btn size="sm" icon={inList ? Check : Bookmark} onPress={() => onAction('shortlist', c)} style={inList ? undefined : undefined} textStyle={inList ? { color: '#1a8f5a' } : undefined}>{inList ? 'Shortlisted' : 'Shortlist'}</Btn>
          <Btn size="sm" variant="primary" onPress={() => onAction('contact', c)}>Contact</Btn>
          <Pressable onPress={() => setMenu(true)} accessibilityLabel="More actions" style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: menu ? C.accentSoft : 'transparent' }}>
            <MoreHorizontal size={16} color={C.ink2} />
          </Pressable>
        </View>
      </View>

      <Sheet open={menu} onClose={() => setMenu(false)} title={c.name} subtitle="More actions">
        {MORE_ACTIONS.map((a) => (
          <Pressable key={a.id} onPress={() => { setMenu(false); setTimeout(() => onAction(a.id, c), 220) }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line2 }}>
            <a.icon size={16} color={C.muted} />
            <T s={14.5}>{a.label}</T>
          </Pressable>
        ))}
        <Pressable onPress={() => { setMenu(false); toggleCompare(c.id) }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <GitCompareArrows size={16} color={C.muted} />
          <T s={14.5}>{inCompare ? 'Remove from compare' : 'Compare'}</T>
        </Pressable>
      </Sheet>
    </View>
  )
}

export default memo(CandidateCard)
