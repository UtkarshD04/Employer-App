import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { Inbox, Mail, MessageSquare, RotateCcw } from 'lucide-react-native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { ErrorBlock, FadeIn, ListSkeleton, Tabs, ago, fmtDateTime } from '../../components/web/rc'
import { Btn, C, EmptyState, Field, Input, T, card } from '../../components/wk'
import { LocalMessages } from './Workspaces'
import { useWorkspace } from '../../store/workspace'
import { apiMessage, listCommLog, listTemplates, resetTemplate, saveTemplate, usePermissions } from '../../services/recruiter'

const CHANNEL = { email: 'Email', in_app: 'MZOBS inbox' }

function Log() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const load = useCallback(() => { setError(''); listCommLog().then(setRows).catch((e) => setError(apiMessage(e, 'Could not load the message log.'))) }, [])
  useEffect(() => { load() }, [load])
  if (error) return <ErrorBlock message={error} onRetry={load} />
  if (!rows) return <ListSkeleton />
  if (rows.length === 0) return <EmptyState icon={MessageSquare} title="No messages sent yet" body="Open an applicant and choose Message to send an interview invite, shortlist update or any other template. Every message is logged here and on the candidate’s history." />
  const t = text.trim().toLowerCase()
  const shown = t ? rows.filter((r) => [r.candidateName, r.subject, r.text, r.sentBy].some((v) => v?.toLowerCase().includes(t))) : rows
  return (
    <View style={{ gap: 8 }}>
      <Input value={text} onChangeText={setText} placeholder="Search by candidate, subject or sender" />
      {shown.length === 0 ? <T s={13} c={C.muted} style={{ textAlign: 'center', paddingVertical: 20 }}>No messages match “{text}”.</T> : null}
      {shown.map((r, k) => (
        <FadeIn key={r.id} index={k}><View style={[card, { padding: 12, gap: 2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {r.channel === 'email' ? <Mail size={14} color={C.muted} /> : <Inbox size={14} color={C.muted} />}
            <T s={14} w="s" style={{ flex: 1 }} numberOfLines={1}>{r.candidateName}</T>
            <T s={12} c={C.muted}>{ago(r.at)}</T>
          </View>
          <T s={13} c={C.ink2} numberOfLines={2}>{r.subject || r.text}</T>
          <T s={12} c={C.muted}>{CHANNEL[r.channel] ?? r.channel} · {r.sentBy || '—'} · {fmtDateTime(r.at)}</T>
        </View></FadeIn>
      ))}
    </View>
  )
}

function Templates({ canEdit, toast }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [key, setKey] = useState(null)
  const [draft, setDraft] = useState({ subject: '', body: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { listTemplates().then((r) => { setData(r); setKey((k) => k ?? r.templates[0]?.key) }).catch((e) => setError(apiMessage(e, 'Could not load templates.'))) }, [])
  useEffect(() => { load() }, [load])
  const current = data?.templates.find((t) => t.key === key)
  useEffect(() => { if (current) { setDraft({ subject: current.subject, body: current.body }); setErrors({}) } }, [current?.key, current?.updatedAt, current?.custom]) // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <ErrorBlock message={error} onRetry={load} />
  if (!data) return <ListSkeleton />
  const dirty = current && (draft.subject !== current.subject || draft.body !== current.body)
  const save = async () => {
    setBusy(true)
    setErrors({})
    try {
      await saveTemplate(key, draft)
      toast('Template saved')
      load()
    } catch (e) {
      setErrors(e.response?.data?.errors ?? { form: apiMessage(e) })
    } finally {
      setBusy(false)
    }
  }
  const reset = () =>
    Alert.alert('Go back to the built-in wording for this template?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            await resetTemplate(key)
            toast('Reset to default')
            load()
          } catch (e) {
            toast(apiMessage(e), { tone: 'warn' })
          }
        },
      },
    ])
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {data.templates.map((t) => {
          const on = key === t.key
          return (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setKey(t.key)} style={{ minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? C.accentSoft : C.surface, paddingHorizontal: 14 }}>
              <T s={13} w="s" c={on ? C.accent : C.ink2}>{t.label}</T>
              {t.custom ? <T s={10} w="b" c={C.muted} style={{ textTransform: 'uppercase' }}>Edited</T> : null}
            </Pressable>
          )
        })}
      </View>
      {current ? (
        <View style={[card, { padding: 14, gap: 14 }]}>
          <Field label="Subject" error={errors.subject}><Input value={draft.subject} onChangeText={(v) => setDraft((d) => ({ ...d, subject: v }))} editable={canEdit} error={errors.subject} /></Field>
          <Field label="Message" error={errors.body}><Input value={draft.body} onChangeText={(v) => setDraft((d) => ({ ...d, body: v }))} editable={canEdit} multiline style={{ minHeight: 220 }} error={errors.body} /></Field>
          <T s={12} c={C.muted}>Placeholders filled in automatically: {data.variables.map((v) => `{{${v}}}`).join('  ')}</T>
          {errors.form ? <T s={13} w="m" c={C.bad}>{errors.form}</T> : null}
          {canEdit ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Btn size="sm" variant="ghost" icon={RotateCcw} onPress={reset} disabled={!current.custom}>Reset to default</Btn>
              <Btn variant="primary" onPress={save} loading={busy} disabled={!dirty}>Save template</Btn>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

export default function MessagesScreen() {
  const { toast } = useWorkspace()
  const { can } = usePermissions()
  const [tab, setTab] = useState('log')
  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Messages" sub="Message candidates from templates and keep a log of everything sent." />
        <Tabs tabs={[['log', 'Sent messages'], ['templates', 'Templates'], ['device', 'Saved on this device']]} value={tab} onChange={setTab} />
        {tab === 'log' ? <Log /> : tab === 'templates' ? <Templates canEdit={can('templates.manage')} toast={toast} /> : <LocalMessages />}
        {tab !== 'device' ? <T s={12} c={C.muted}>Email needs the candidate’s email to be unlocked. MZOBS inbox reaches candidates who applied through MZOBS. Bulk SMS and WhatsApp are not offered: they require recorded consent and DLT-approved templates.</T> : null}
      </PageScroll>
    </Shell>
  )
}
