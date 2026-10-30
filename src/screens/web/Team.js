import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { Check, Minus, UserPlus, Users } from 'lucide-react-native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { ErrorBlock, ListSkeleton, Tabs, ago, fmtDateTime } from '../../components/web/rc'
import { Avatar, Btn, C, EmptyState, Field, Input, Select, Sheet, T, card } from '../../components/wk'
import { useWorkspace } from '../../store/workspace'
import { apiMessage, getRoleMatrix, inviteMember, listAudit, listTeam, removeMember, setMemberRole, usePermissions } from '../../services/recruiter'

const ROLE_BLURB = {
  Owner: 'Full control, including other Owners.',
  Admin: 'Everything except changing Owner access.',
  Recruiter: 'Jobs, applicants, interviews, offers, unlocks.',
  Interviewer: 'Only candidates they interview; submits scorecards.',
  Finance: 'Credits, invoices and billing.',
}

const initials = (name = '') => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

function Members({ can, role: myRole, myId, toast }) {
  const [members, setMembers] = useState(null)
  const [roles, setRoles] = useState([])
  const [error, setError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [f, setF] = useState({ name: '', email: '', role: 'Recruiter' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const manage = can('team.manage')

  const load = useCallback(() => {
    listTeam().then(setMembers).catch((e) => setError(apiMessage(e, 'Could not load the team.')))
  }, [])
  useEffect(() => {
    load()
    getRoleMatrix().then((m) => setRoles(m.roles)).catch(() => {})
  }, [load])

  const assignable = roles.filter((r) => r !== 'Owner' || myRole === 'Owner')
  const act = async (fn, ok) => {
    try {
      await fn()
      toast(ok)
      load()
    } catch (e) {
      toast(apiMessage(e), { tone: 'warn' })
    }
  }
  const invite = async () => {
    setBusy(true)
    setErr('')
    try {
      await inviteMember(f)
      toast(`${f.name} added to the team`)
      setInviting(false)
      setF({ name: '', email: '', role: 'Recruiter' })
      load()
    } catch (e) {
      setErr(apiMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const confirmRemove = (m) => Alert.alert(`Remove ${m.name} from the team?`, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => act(() => removeMember(m.id), `${m.name} removed`) }])

  if (error) return <ErrorBlock message={error} onRetry={load} />
  if (!members) return <ListSkeleton />
  return (
    <View style={{ gap: 12 }}>
      {manage ? <Btn variant="primary" size="sm" icon={UserPlus} onPress={() => setInviting(true)} style={{ alignSelf: 'flex-end' }}>Add team member</Btn> : null}
      {members.map((m) => (
        <View key={m.id} style={[card, { padding: 14, gap: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar candidate={{ id: m.id, initials: initials(m.name) }} size={36} />
            <View style={{ flex: 1 }}>
              <T s={14.5} w="b" numberOfLines={1}>{m.name}{m.id === myId ? <T s={12} w="m" c={C.muted}>  (you)</T> : null}</T>
              {m.email ? <T s={12.5} c={C.muted} numberOfLines={1}>{m.email}</T> : null}
            </View>
            <T s={12.5} c={C.ink2} style={{ textTransform: 'capitalize' }}>{m.status}</T>
          </View>
          <T s={12} c={C.muted}>Last active {m.lastActive || '—'}</T>
          {manage ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Select style={{ flex: 1 }} value={m.role} title={`Role for ${m.name}`} onChange={(v) => v !== m.role && act(() => setMemberRole(m.id, v), `${m.name} is now ${v}`)} options={[...new Set([m.role, ...assignable])].filter((r) => r !== 'Hiring Manager' || r === m.role)} />
              <Pressable onPress={() => confirmRemove(m)} hitSlop={8}><T s={12.5} w="s" c={C.bad}>Remove</T></Pressable>
            </View>
          ) : <T s={13} w="s">{m.role}</T>}
        </View>
      ))}
      <Sheet open={inviting} onClose={busy ? () => {} : () => setInviting(false)} title="Add team member" footer={<><Btn onPress={() => setInviting(false)} disabled={busy}>Cancel</Btn><Btn variant="primary" onPress={invite} loading={busy} disabled={!f.name.trim() || !f.email.trim()}>Add member</Btn></>}>
        <View style={{ gap: 16 }}>
          <Field label="Name"><Input value={f.name} onChangeText={(v) => setF((x) => ({ ...x, name: v }))} /></Field>
          <Field label="Work email"><Input value={f.email} onChangeText={(v) => setF((x) => ({ ...x, email: v }))} keyboardType="email-address" autoCapitalize="none" /></Field>
          <Field label="Role" hint={ROLE_BLURB[f.role]}><Select value={f.role} title="Role" onChange={(v) => setF((x) => ({ ...x, role: v }))} options={assignable} /></Field>
          {err ? <T s={13} w="m" c={C.bad}>{err}</T> : null}
        </View>
      </Sheet>
    </View>
  )
}

function Matrix() {
  const [m, setM] = useState(null)
  useEffect(() => { getRoleMatrix().then(setM).catch(() => setM({ roles: [], permissions: [] })) }, [])
  if (!m) return <ListSkeleton rows={3} />
  const W = 74
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={[card, { borderRadius: 12 }]}>
      <View>
        <View style={{ flexDirection: 'row', backgroundColor: '#faf9f6', borderBottomWidth: 1, borderBottomColor: C.line }}>
          <T s={11.5} w="b" c={C.ink2} style={{ width: 200, paddingHorizontal: 12, paddingVertical: 8, textTransform: 'uppercase' }}>Permission</T>
          {m.roles.map((r) => <T key={r} s={11.5} w="b" c={C.ink2} style={{ width: W, textAlign: 'center', paddingVertical: 8 }}>{r}</T>)}
        </View>
        {m.permissions.map((p, i) => (
          <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
            <T s={13} style={{ width: 200, paddingHorizontal: 12, paddingVertical: 8 }}>{p.label}</T>
            {m.roles.map((r) => (
              <View key={r} style={{ width: W, alignItems: 'center' }}>
                {p.roles.includes(r) ? <Check size={15} color={C.accent} accessibilityLabel="Allowed" /> : <Minus size={15} color="#c5d0d8" accessibilityLabel="Not allowed" />}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function Audit() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => {
    setError('')
    listAudit({ page, ...(action && { action }) }).then(setData).catch((e) => setError(apiMessage(e, 'Could not load the audit trail.')))
  }, [action, page])
  if (error) return <ErrorBlock message={error} />
  if (!data) return <ListSkeleton />
  return (
    <View style={{ gap: 12 }}>
      <Select value={action} title="Filter by action" onChange={(v) => { setAction(v); setPage(1) }} options={[['', 'All actions'], ...Object.entries(data.actions)]} />
      <T s={12.5} c={C.muted}>{data.total} entr{data.total === 1 ? 'y' : 'ies'}</T>
      {data.items.length === 0 ? <EmptyState icon={Users} title="Nothing recorded yet" body="Unlocks, stage moves, rejections, job publishing and billing changes appear here with who did them." /> : data.items.map((a) => (
        <View key={a.id} style={[card, { padding: 12, gap: 2 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T s={13.5} w="s" style={{ flex: 1 }}>{a.label}</T>
            <T s={12} c={C.muted}>{ago(a.at)}</T>
          </View>
          <T s={12.5}><T s={12.5} w="s">{a.actorName || 'System'}</T>{a.actorRole ? <T s={11.5} c={C.muted}>  {a.actorRole}</T> : null}</T>
          <T s={12.5} c={C.ink2}>{[a.targetLabel, a.detail].filter(Boolean).join(' · ') || '—'}</T>
          <T s={11.5} c={C.muted}>{fmtDateTime(a.at)}</T>
        </View>
      ))}
      {data.pages > 1 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <Btn size="sm" disabled={page <= 1} onPress={() => setPage((p) => p - 1)}>Previous</Btn>
          <T s={13} c={C.muted}>Page {page} of {data.pages}</T>
          <Btn size="sm" disabled={page >= data.pages} onPress={() => setPage((p) => p + 1)}>Next</Btn>
        </View>
      ) : null}
    </View>
  )
}

export default function TeamScreen() {
  const { toast } = useWorkspace()
  const { can, role, loaded, me } = usePermissions()
  const [tab, setTab] = useState('members')
  const tabs = [['members', 'Members'], ['permissions', 'Role permissions'], ...(can('audit.view') ? [['audit', 'Audit trail']] : [])]
  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Team & Permissions" sub="Who can do what in your hiring workspace." />
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        {!loaded ? <ListSkeleton rows={3} /> : tab === 'members' ? <Members can={can} role={role} myId={me?.id} toast={toast} /> : tab === 'permissions' ? <Matrix /> : <Audit />}
      </PageScroll>
    </Shell>
  )
}
