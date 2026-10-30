import { Pressable, ScrollView, View } from 'react-native'
import { BellRing, Briefcase, MapPin, Star } from 'lucide-react-native'
import { Avatar, C, CheckBox, T, Tag, card } from '../../wk'
import { FadeIn, STAGE_TONE, StagePill, fmtDate } from '../rc'
import { PIPELINE, STAGE_LABEL } from '../../../services/recruiter'

const dueNow = (c) => c.followUpOn && new Date(c.followUpOn) <= new Date()

function OwnerChip({ owner }) {
  if (!owner) return <T s={11.5} c={C.muted}>Unassigned</T>
  const initials = owner.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#dfe7ee', alignItems: 'center', justifyContent: 'center' }}><T s={8.5} w="b" c={C.ink2} style={{ lineHeight: 11 }}>{initials}</T></View>
      <T s={11.5} c={C.ink2}>{owner.name.split(' ')[0]}</T>
    </View>
  )
}

function Highlights({ list, max = 2 }) {
  if (!list?.length) return null
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {list.slice(0, max).map((h) => (
        <View key={h.label} style={{ borderRadius: 5, backgroundColor: h.ok ? C.accentSoft : '#f3efe6', paddingHorizontal: 6, paddingVertical: 1.5 }}>
          <T s={11} w="s" c={h.ok ? C.accent : '#7a5a14'}>{h.label}</T>
        </View>
      ))}
    </View>
  )
}

/** One applicant. Tapping opens them; the checkbox (managers only) selects for bulk actions. */
export function ApplicantCard({ c, selected, onSelect, onOpen, canManage, showJob, showStage }) {
  return (
    <Pressable onPress={() => onOpen(c.id)} accessibilityRole="button" accessibilityLabel={`${c.name}, ${c.currentRole || 'role not stated'}, ${STAGE_LABEL[c.stage]}`} style={[card, { padding: 12, borderRadius: 12, gap: 6 }, selected && { borderColor: C.accent, backgroundColor: '#f1f9f7' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {canManage ? <CheckBox checked={selected} onChange={() => onSelect(c.id)} style={{ minHeight: 0 }} /> : null}
        <Avatar candidate={c} size={34} />
        <View style={{ flex: 1 }}>
          <T s={14} w="s" numberOfLines={1}>{c.name}</T>
          <T s={12.5} c={C.muted} numberOfLines={1}>{c.currentRole || 'Role not stated'}</T>
        </View>
        {c.premium ? <Star size={13} color="#b8860b" fill="#b8860b" /> : null}
        {showStage ? <StagePill stage={c.stage} label={STAGE_LABEL[c.stage]} /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2 }}>
        <T s={11.5} c={C.ink2}>{c.experienceYears} yrs</T>
        {c.location ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><MapPin size={11} color={C.muted} /><T s={11.5} c={C.ink2}>{c.location}</T></View> : null}
        <T s={11.5} c={C.muted}>Applied {fmtDate(c.appliedAt, { day: 'numeric', month: 'short' })}</T>
      </View>
      {showJob && c.jobTitle ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Briefcase size={11} color={C.muted} /><T s={11.5} c={C.muted} numberOfLines={1} style={{ flex: 1 }}>{c.jobTitle}</T></View> : null}
      <Highlights list={c.highlights} max={showStage ? 3 : 2} />
      {c.tags.length > 0 || dueNow(c) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
          {c.tags.slice(0, 2).map((t) => <Tag key={t}>{t}</Tag>)}
          {c.tags.length > 2 ? <T s={11} c={C.muted}>+{c.tags.length - 2}</T> : null}
          {dueNow(c) ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><BellRing size={11} color={C.warn} /><T s={11} w="s" c={C.warn}>Follow up</T></View> : null}
        </View>
      ) : null}
      <View style={{ borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 6 }}><OwnerChip owner={c.owner} /></View>
    </Pressable>
  )
}

/** Board: the pipeline's stages as a strip of counts — tap a stage to work through its column. */
export function Board({ items, counts, stage, onStage, selected, onSelect, onOpen, canManage, showJob }) {
  const rows = items.filter((c) => c.stage === stage)
  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="tablist">
        {PIPELINE.map((col) => {
          const on = col.key === stage
          return (
            <Pressable key={col.key} onPress={() => onStage(col.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: on ? C.ink : C.line, backgroundColor: on ? C.ink : '#fff', paddingHorizontal: 14 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: on ? '#fff' : STAGE_TONE[col.key][1] }} />
              <T s={12.5} w="b" c={on ? '#fff' : C.ink2}>{col.label}</T>
              <View style={{ borderRadius: 999, backgroundColor: on ? 'rgba(255,255,255,0.2)' : C.line2, paddingHorizontal: 6, paddingVertical: 1 }}><T s={11.5} w="s" c={on ? '#fff' : C.ink2}>{counts[col.key] ?? 0}</T></View>
            </Pressable>
          )
        })}
      </ScrollView>
      {rows.length === 0 ? (
        <View style={{ paddingVertical: 36, alignItems: 'center' }}><T s={13} c={C.muted}>Nobody in {STAGE_LABEL[stage]} yet</T></View>
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((c, k) => <FadeIn key={c.id} index={k}><ApplicantCard c={c} selected={selected.has(c.id)} onSelect={onSelect} onOpen={onOpen} canManage={canManage} showJob={showJob} /></FadeIn>)}
        </View>
      )}
    </View>
  )
}

/** List: everyone, with their stage shown on each row. */
export function ApplicantList({ items, selected, onSelect, onSelectAll, onOpen, canManage, showJob }) {
  const all = items.length > 0 && items.every((c) => selected.has(c.id))
  return (
    <View style={{ gap: 8 }}>
      {canManage ? <CheckBox checked={all} onChange={() => onSelectAll(!all)}>Select all {items.length}</CheckBox> : null}
      {items.map((c) => <ApplicantCard key={c.id} c={c} selected={selected.has(c.id)} onSelect={onSelect} onOpen={onOpen} canManage={canManage} showJob={showJob} showStage />)}
    </View>
  )
}
