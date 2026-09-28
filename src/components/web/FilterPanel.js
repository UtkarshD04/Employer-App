import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { BookmarkPlus, ChevronDown, X } from 'lucide-react-native'
import { NOTICE_OPTIONS, STAGE_LABELS, criteriaToChips, removeChip } from '../../lib/talent/criteria'
import { vocab } from '../../lib/talent/vocab'
import { C, CheckBox, Chip, F, Radio, Select, T, card } from '../wk'

const EMPLOYMENT_TYPE_LIST = ['Full-time', 'Part-time', 'Contract', 'Internship']

/** Chips + free text; suggestions appear under the box as you type. */
export function TagInput({ values, onChange, placeholder, suggestions = [] }) {
  const [text, setText] = useState('')
  const [focus, setFocus] = useState(false)
  const add = (v) => {
    const t = v.trim().replace(/,$/, '')
    if (t && !values.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...values, t])
    setText('')
  }
  const matches = text ? suggestions.filter((s) => s.toLowerCase().includes(text.toLowerCase()) && !values.includes(s)).slice(0, 6) : []
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: focus ? C.accent : C.line, backgroundColor: '#fff', padding: 6 }}>
        {values.map((v) => <Chip key={v} tone="accent" onRemove={() => onChange(values.filter((x) => x !== v))}>{v}</Chip>)}
        <TextInput
          value={text}
          onChangeText={(t) => (t.endsWith(',') ? add(t) : setText(t))}
          onSubmitEditing={() => text.trim() && add(matches[0] ?? text)}
          onKeyPress={(e) => e.nativeEvent.key === 'Backspace' && !text && values.length && onChange(values.slice(0, -1))}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          blurOnSubmit={false}
          placeholder={values.length ? '' : placeholder}
          placeholderTextColor={C.ph}
          selectionColor={C.accent}
          autoCapitalize="none"
          style={{ minWidth: 90, flex: 1, fontFamily: F.r, fontSize: 13, color: C.ink, paddingVertical: 6, paddingHorizontal: 4 }}
        />
      </View>
      {matches.length > 0 ? (
        <View style={{ marginTop: 4, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', padding: 4 }}>
          {matches.map((m) => (
            <Pressable key={m} onPress={() => add(m)} style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 6 }}>
              <T s={13}>{m}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function Section({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: C.line2 }}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityState={{ expanded: open }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T s={13.5} w="s">{title}</T>
          {count > 0 ? <View style={{ minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><T s={10} w="b" c="#fff" style={{ lineHeight: 12 }}>{count}</T></View> : null}
        </View>
        <ChevronDown size={15} color={C.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <View style={{ paddingBottom: 14 }}>{children}</View> : null}
    </View>
  )
}

function Label({ children, first }) {
  return <T s={12} w="m" c={C.muted} style={{ marginBottom: 6, marginTop: first ? 0 : 12 }}>{children}</T>
}

function NumberPair({ a, b, onA, onB, unit, prefix, pa = 'Min', pb = 'Max' }) {
  const parse = (v) => (v === '' ? null : Math.max(0, Number(v)))
  const box = (val, on, ph) => (
    <View style={{ flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 10 }}>
      {prefix ? <T s={13} c={C.muted}>{prefix} </T> : null}
      <TextInput value={val == null ? '' : String(val)} onChangeText={(t) => on(parse(t.replace(/[^\d.]/g, '')))} keyboardType="numeric" placeholder={ph} placeholderTextColor={C.ph} style={{ flex: 1, fontFamily: F.r, fontSize: 13, color: C.ink, paddingVertical: 0 }} />
    </View>
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {box(a, onA, pa)}
      <T c={C.muted}>—</T>
      {box(b, onB, pb)}
      {unit ? <T s={12} c={C.muted}>{unit}</T> : null}
    </View>
  )
}

/** Free text with tap-to-fill suggestions (the website's <datalist>). */
function Suggest({ value, onChange, placeholder, options = [] }) {
  const [focus, setFocus] = useState(false)
  const matches = focus && value ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()) && o.toLowerCase() !== value.toLowerCase()).slice(0, 5) : []
  return (
    <View>
      <TextInput value={value} onChangeText={onChange} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} placeholder={placeholder} placeholderTextColor={C.ph} selectionColor={C.accent} style={{ minHeight: 40, borderRadius: 8, borderWidth: 1, borderColor: focus ? C.accent : C.line, backgroundColor: '#fff', paddingHorizontal: 10, fontFamily: F.r, fontSize: 13, color: C.ink }} />
      {matches.length > 0 ? (
        <View style={{ marginTop: 4, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', padding: 4 }}>
          {matches.map((m) => <Pressable key={m} onPress={() => onChange(m)} style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 10 }}><T s={13}>{m}</T></Pressable>)}
        </View>
      ) : null}
    </View>
  )
}

function Presets({ items, active, onPick }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
      {items.map(([label, val]) => (
        <Pressable key={label} onPress={() => onPick(val)} style={{ minHeight: 34, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: active(val) ? C.accent : C.line, backgroundColor: active(val) ? C.accentSoft : '#fff', paddingHorizontal: 12 }}>
          <T s={12} w="m" c={active(val) ? C.accent : C.ink2}>{label}</T>
        </Pressable>
      ))}
    </View>
  )
}

const EXP_PRESETS = [['Fresher', [0, 1]], ['1–3', [1, 3]], ['3–5', [3, 5]], ['5–8', [5, 8]], ['8–12', [8, 12]], ['12+', [12, null]]]
const ACTIVE_OPTIONS = [['Any time', null], ['Last 1 day', 1], ['Last 7 days', 7], ['Last 14 days', 14], ['Last 30 days', 30], ['Last 90 days', 90]]
const FRESH_OPTIONS = [['Any time', null], ['Last 7 days', 7], ['Last 30 days', 30], ['Last 90 days', 90], ['Last 6 months', 180]]
const PROFILE_OPTIONS = [['Any', null], ['≥ 50%', 50], ['≥ 70%', 70], ['≥ 90%', 90]]
const TRUST_OPTIONS = [['Any', null], ['≥ 40', 40], ['≥ 60', 60], ['≥ 80', 80]]
const CV_ACCESS_OPTIONS = [['Any', ''], ['CV unlocked', 'unlocked'], ['Not unlocked yet', 'locked']]

const Choice = ({ value, options, onChange }) => options.map(([label, v]) => <Radio key={label} checked={value === v} onPress={() => onChange(v)}>{label}</Radio>)
const anyOpt = (placeholder) => (list) => [['', placeholder], ...list.map((x) => [x, x])]

export default function FilterPanel({ criteria, onChange, onSave, onClear, meta }) {
  const m = meta ?? {}
  const c = criteria
  const set = (patch) => onChange({ ...c, ...patch })
  const chips = criteriaToChips(c)
  const n = (...flags) => flags.filter(Boolean).length
  const show = (k) => m[k] !== false // unknown meta (still loading) shows everything

  return (
    <View style={card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line, paddingHorizontal: 16, paddingVertical: 10 }}>
        <T s={14} w="s">Filters</T>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={onSave} disabled={!chips.length} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, opacity: chips.length ? 1 : 0.4 }}>
            <BookmarkPlus size={13} color={C.accent} />
            <T s={12.5} w="m" c={C.accent}>Save search</T>
          </Pressable>
          <Pressable onPress={onClear} disabled={!chips.length && !c.q.trim()} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, opacity: chips.length || c.q.trim() ? 1 : 0.4 }}>
            <X size={12} color={C.accent} />
            <T s={12.5} w="s" c={C.accent}>Clear all</T>
          </Pressable>
        </View>
      </View>

      {chips.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderBottomWidth: 1, borderBottomColor: C.line2, paddingHorizontal: 16, paddingVertical: 12 }}>
          {chips.map((x) => <Chip key={x.key} tone="accent" onRemove={() => onChange(removeChip(c, x.key))}>{x.label}</Chip>)}
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 16 }}>
        {m.pipeline && (m.jobs?.length > 0 || m.stages?.length > 0) ? (
          <Section title="Job & pipeline" defaultOpen count={n(c.forJobId, c.stage)}>
            <View style={{ gap: 4 }}>
              {m.jobs?.length > 0 ? <Select value={c.forJobId} onChange={(v) => set({ forJobId: v, forJobTitle: m.jobs.find((j) => j.id === v)?.title ?? '' })} title="Job" options={[['', 'All jobs'], ...m.jobs.map((j) => [j.id, j.title])]} /> : null}
              <Radio checked={!c.stage} onPress={() => set({ stage: '' })}>Any stage</Radio>
              {m.stages.map((st) => <Radio key={st} checked={c.stage === st} onPress={() => set({ stage: st })}>{STAGE_LABELS[st] ?? st}</Radio>)}
            </View>
          </Section>
        ) : null}

        <Section title="Keywords" defaultOpen count={c.keywords.length + c.anyKeywords.length + c.exclude.length}>
          <Label first>Must include (all)</Label>
          <TagInput values={c.keywords} onChange={(keywords) => set({ keywords })} placeholder="Add keyword…" />
          <Label>Any of these (at least one)</Label>
          <TagInput values={c.anyKeywords} onChange={(anyKeywords) => set({ anyKeywords })} placeholder="e.g. startup, fintech…" />
          <Label>Exclude</Label>
          <TagInput values={c.exclude} onChange={(exclude) => set({ exclude })} placeholder="Exclude keyword…" />
        </Section>

        <Section title="Skills" defaultOpen count={c.skills.length}>
          <TagInput values={c.skills} onChange={(skills) => set({ skills })} placeholder="Python, React, AWS…" suggestions={vocab.skills} />
          {c.skills.length > 1 ? (
            <View style={{ flexDirection: 'row', marginTop: 8, borderRadius: 999, borderWidth: 1, borderColor: C.line, padding: 2 }}>
              {[['any', 'Any skill'], ['all', 'All skills']].map(([v, l]) => (
                <Pressable key={v} onPress={() => set({ skillsMode: v })} accessibilityState={{ selected: c.skillsMode === v }} style={{ flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: c.skillsMode === v ? C.accent : 'transparent' }}>
                  <T s={12} w="s" c={c.skillsMode === v ? '#fff' : C.muted}>{l}</T>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Section>

        <Section title="Experience" defaultOpen={c.expMin != null || c.expMax != null} count={n(c.expMin != null || c.expMax != null)}>
          <Presets items={EXP_PRESETS} active={([a, b]) => c.expMin === a && c.expMax === b} onPick={([expMin, expMax]) => set({ expMin, expMax })} />
          <NumberPair a={c.expMin} b={c.expMax} onA={(expMin) => set({ expMin })} onB={(expMax) => set({ expMax })} unit="yrs" />
        </Section>

        <Section title="Location" defaultOpen={c.locations.length > 0} count={c.locations.length + c.prefLocations.length + n(c.relocate)}>
          <Label first>Current location</Label>
          <TagInput values={c.locations} onChange={(locations) => set({ locations })} placeholder="City…" suggestions={vocab.cities} />
          {c.locations.length > 0 ? <CheckBox checked={c.alsoPreferred} onChange={(alsoPreferred) => set({ alsoPreferred })}>Include people who prefer to relocate here</CheckBox> : null}
          {show('relocation') ? (
            <>
              <Label>Preferred location</Label>
              <TagInput values={c.prefLocations} onChange={(prefLocations) => set({ prefLocations })} placeholder="Where they want to work…" suggestions={vocab.cities} />
              <CheckBox checked={c.relocate} onChange={(relocate) => set({ relocate })}>Open to relocation</CheckBox>
            </>
          ) : null}
        </Section>

        {show('salary') || show('currentSalary') ? (
          <Section title="Salary" count={n(c.salaryMin != null || c.salaryMax != null, c.curSalaryMin != null || c.curSalaryMax != null)}>
            {show('salary') ? (<><Label first>Expected annual salary</Label><NumberPair prefix="₹" a={c.salaryMin} b={c.salaryMax} onA={(salaryMin) => set({ salaryMin })} onB={(salaryMax) => set({ salaryMax })} unit="LPA" /></>) : null}
            {show('currentSalary') ? (<><Label>Current annual salary</Label><NumberPair prefix="₹" a={c.curSalaryMin} b={c.curSalaryMax} onA={(curSalaryMin) => set({ curSalaryMin })} onB={(curSalaryMax) => set({ curSalaryMax })} unit="LPA" /></>) : null}
          </Section>
        ) : null}

        {show('notice') ? (
          <Section title="Notice period" count={n(c.noticeMax != null)}>
            <Radio checked={c.noticeMax == null} onPress={() => set({ noticeMax: null })}>Any</Radio>
            {NOTICE_OPTIONS.map((o) => <Radio key={o.value} checked={c.noticeMax === o.value} onPress={() => set({ noticeMax: o.value })}>{o.label}</Radio>)}
          </Section>
        ) : null}

        <Section title="Role & company" count={n(c.designation, c.company, c.prevCompany, c.industry, c.department, c.companyType)}>
          <Label first>Current designation</Label>
          <Suggest value={c.designation} onChange={(designation) => set({ designation })} placeholder="e.g. Senior Developer" options={vocab.roles} />
          {show('company') ? (<><Label>Current company</Label><Suggest value={c.company} onChange={(company) => set({ company })} placeholder="Company name" options={vocab.companies} /></>) : null}
          {show('prevCompany') ? (<><Label>Previous company</Label><Suggest value={c.prevCompany} onChange={(prevCompany) => set({ prevCompany })} placeholder="Worked earlier at…" options={vocab.companies} /></>) : null}
          {show('industry') ? (<><Label>Industry</Label><Select value={c.industry} onChange={(industry) => set({ industry })} options={anyOpt('Any industry')(vocab.industries)} title="Industry" /></>) : null}
          {show('department') ? (<><Label>Department</Label><Select value={c.department} onChange={(department) => set({ department })} options={anyOpt('Any department')(vocab.departments)} title="Department" /></>) : null}
          {show('companyType') ? (<><Label>Company type</Label><Select value={c.companyType} onChange={(companyType) => set({ companyType })} options={anyOpt('Any company type')(vocab.companyTypes)} title="Company type" /></>) : null}
        </Section>

        <Section title="Education" count={n(c.degree, c.institute, c.education, c.gradFrom != null || c.gradTo != null)}>
          {show('degree') ? (<><Label first>Degree</Label><Suggest value={c.degree} onChange={(degree) => set({ degree })} placeholder="e.g. B.Tech" options={vocab.degrees} /></>) : null}
          {show('institute') ? (<><Label>Institute</Label><Suggest value={c.institute} onChange={(institute) => set({ institute })} placeholder="College / university" options={vocab.institutes} /></>) : null}
          {show('gradYear') ? (<><Label>Year of passing</Label><NumberPair a={c.gradFrom} b={c.gradTo} onA={(gradFrom) => set({ gradFrom })} onB={(gradTo) => set({ gradTo })} pa="From" pb="To" /></>) : null}
        </Section>

        {show('workMode') || show('employmentType') ? (
          <Section title="Work preferences" count={n(c.workMode, c.employmentType)}>
            {show('workMode') ? (<><Label first>Work mode</Label>{['', 'Remote', 'Hybrid', 'On-site'].map((w) => <Radio key={w || 'any'} checked={c.workMode === w} onPress={() => set({ workMode: w })}>{w || 'Any'}</Radio>)}</>) : null}
            {show('employmentType') ? (<><Label>Employment type</Label><Select value={c.employmentType} onChange={(employmentType) => set({ employmentType })} options={anyOpt('Any type')(EMPLOYMENT_TYPE_LIST)} title="Employment type" /></>) : null}
          </Section>
        ) : null}

        {show('languages') || show('certifications') ? (
          <Section title="Languages & certifications" count={c.languages.length + n(c.hasCertification)}>
            {show('languages') ? (<><Label first>Languages spoken (all)</Label><TagInput values={c.languages} onChange={(languages) => set({ languages })} placeholder="English, Hindi…" suggestions={vocab.languages} /></>) : null}
            {show('certifications') ? <CheckBox checked={c.hasCertification} onChange={(hasCertification) => set({ hasCertification })} style={{ marginTop: 8 }}>Has certifications</CheckBox> : null}
          </Section>
        ) : null}

        {show('activity') || show('resumeDate') ? (
          <Section title="Candidate activity" count={n(c.activeDays != null, c.resumeFreshDays != null)}>
            {show('activity') ? (<><Label first>Active in</Label><Choice value={c.activeDays} options={ACTIVE_OPTIONS} onChange={(activeDays) => set({ activeDays })} /></>) : null}
            {show('resumeDate') ? (<><Label>Resume updated</Label><Choice value={c.resumeFreshDays} options={FRESH_OPTIONS} onChange={(resumeFreshDays) => set({ resumeFreshDays })} /></>) : null}
          </Section>
        ) : null}

        <Section title="Verification & quality" defaultOpen count={n(c.verifiedOnly, c.contactVerified, c.verifiedEducation, c.verifiedEmployment, c.minMatch != null, c.profileMin != null, c.trustMin != null, c.hasPortfolio, c.hasVideo)}>
          <CheckBox checked={c.verifiedOnly} onChange={(verifiedOnly) => set({ verifiedOnly })}>Identity verified</CheckBox>
          {show('contactVerified') ? <CheckBox checked={c.contactVerified} onChange={(contactVerified) => set({ contactVerified })}>Phone &amp; email verified</CheckBox> : null}
          <CheckBox checked={c.verifiedEducation} onChange={(verifiedEducation) => set({ verifiedEducation })}>Education verified</CheckBox>
          <CheckBox checked={c.verifiedEmployment} onChange={(verifiedEmployment) => set({ verifiedEmployment })}>Employment verified</CheckBox>
          {m.portfolio ? <CheckBox checked={c.hasPortfolio} onChange={(hasPortfolio) => set({ hasPortfolio })}>Has portfolio</CheckBox> : null}
          {m.video ? <CheckBox checked={c.hasVideo} onChange={(hasVideo) => set({ hasVideo })}>Has video intro</CheckBox> : null}
          <CheckBox checked={c.minMatch != null} onChange={(v) => set({ minMatch: v ? 80 : null })}>AI match &gt; 80</CheckBox>
          <Label>Mzobs Trust Score</Label>
          <Choice value={c.trustMin} options={TRUST_OPTIONS} onChange={(trustMin) => set({ trustMin })} />
          <Label>Profile completeness</Label>
          <Choice value={c.profileMin} options={PROFILE_OPTIONS} onChange={(profileMin) => set({ profileMin })} />
        </Section>

        {show('gender') ? (
          <Section title="Diversity hiring" count={n(c.gender)}>
            <View style={{ borderRadius: 8, backgroundColor: C.warnSoft, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 }}>
              <T s={11.5} c={C.warn}>Use only where the law and your hiring policy allow inclusive or diversity-focused sourcing. Values are self-declared by candidates.</T>
            </View>
            <Radio checked={!c.gender} onPress={() => set({ gender: '' })}>Any</Radio>
            {['Female', 'Male', 'Non-binary'].map((g) => <Radio key={g} checked={c.gender === g} onPress={() => set({ gender: g })}>{g}</Radio>)}
          </Section>
        ) : null}

        <View>
          <Section title="Already actioned" count={n(c.hideContacted, c.hideShortlisted, c.hideViewed, c.cvAccess)}>
            <CheckBox checked={c.hideContacted} onChange={(hideContacted) => set({ hideContacted })}>Hide candidates I’ve contacted</CheckBox>
            <CheckBox checked={c.hideShortlisted} onChange={(hideShortlisted) => set({ hideShortlisted })}>Hide shortlisted candidates</CheckBox>
            <CheckBox checked={c.hideViewed} onChange={(hideViewed) => set({ hideViewed })}>Hide profiles I’ve viewed</CheckBox>
            {m.pipeline ? (
              <>
                <Label>CV access</Label>
                <Choice value={c.cvAccess} options={CV_ACCESS_OPTIONS} onChange={(cvAccess) => set({ cvAccess })} />
              </>
            ) : null}
          </Section>
        </View>
      </View>
    </View>
  )
}
