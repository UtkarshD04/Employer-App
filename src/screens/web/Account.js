import { useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { Bell, CheckCheck, CreditCard, FileText, HelpCircle, LifeBuoy, Building2, LogOut, Mail, Settings as Cog, Trash2, Users } from 'lucide-react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import { PageScroll, PageTitle, Shell, useSignOut } from '../../components/web/Shell'
import { Btn, C, EmptyState, Field, Input, Select, Sheet, Skeleton, T, card } from '../../components/wk'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../store/workspace'
import { listNotifications, markAllRead, markRead } from '../../services/notificationsService'
import { TICKET_CATEGORIES, submitTicket } from '../../services/supportService'
import { deleteAccount } from '../../services/authService'
import { queryKeys } from '../../lib/queryClient'
import { formatRelative } from '../../lib/format'

const TONE = {
  jobs: [C.blueSoft, '#1f6fb2'], candidates: [C.accentSoft, C.accent], billing: [C.warnSoft, C.warn], interviews: [C.aiSoft, '#0a6f64'],
  offers: [C.okSoft, C.okText], batches: [C.accentSoft, C.accent], system: [C.line2, C.ink2],
}
// Where a notification's category leads inside the recruiter app.
const ROUTES = { jobs: 'Jobs', candidates: 'Search', batches: 'Search', interviews: 'Interviews', offers: 'Offers', billing: 'PlanCredits' }

export function NotificationsScreen() {
  const nav = useNavigation()
  const qc = useQueryClient()
  const { toast } = useWorkspace()
  const q = useQuery({ queryKey: queryKeys.notifications, queryFn: listNotifications })
  const items = q.data
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.notifications })
  const read = useMutation({ mutationFn: markRead, onSuccess: refresh })
  const readAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => { refresh(); toast('All notifications marked as read') },
    onError: () => toast('Could not update notifications', { tone: 'warn' }),
  })
  const open = (n) => {
    if (n.unread) read.mutate(n.id)
    const to = ROUTES[n.category]
    if (to) nav.navigate(to)
  }
  const unread = items?.filter((i) => i.unread).length ?? 0
  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Notifications" sub="Updates about your jobs, candidates, interviews and billing." />
        {q.isError ? (
          <EmptyState icon={Bell} title="Couldn’t load notifications" action={<Btn onPress={() => q.refetch()}>Retry</Btn>} />
        ) : !items ? (
          <View style={{ gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={64} r={16} />)}</View>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title="You’re all caught up" body="New activity on your jobs and candidates shows up here." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T s={13} c={C.muted}>{unread ? `${unread} unread` : 'All read'}</T>
              {unread > 0 ? <Btn size="sm" icon={CheckCheck} loading={readAll.isPending} onPress={() => readAll.mutate()}>Mark all as read</Btn> : null}
            </View>
            <View style={{ gap: 8 }}>
              {items.map((n) => {
                const [bg, fg] = TONE[n.category] ?? TONE.system
                return (
                  <Pressable key={n.id} onPress={() => open(n)} style={[card, { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderColor: n.unread ? '#bfe6df' : C.line, backgroundColor: n.unread ? '#f2fbf9' : '#fff' }]}>
                    <View style={{ borderRadius: 6, backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 }}><T s={11} w="s" c={fg} style={{ textTransform: 'capitalize' }}>{n.category}</T></View>
                    <View style={{ flex: 1 }}>
                      <T s={14} w="s">{n.title}</T>
                      <T s={13} c={C.ink2}>{n.body}</T>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <T s={12} c={C.muted}>{n.time ?? formatRelative(n.createdAt)}</T>
                      {n.unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }} /> : null}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </>
        )}
      </PageScroll>
    </Shell>
  )
}

export function HelpScreen() {
  const { toast } = useWorkspace()
  const [f, setF] = useState({ subject: '', category: 'General', message: '' })
  const [sent, setSent] = useState(false)
  const set = (p) => setF((x) => ({ ...x, ...p }))
  const valid = f.subject.trim() && f.message.trim().length >= 10
  const send = useMutation({
    mutationFn: () => submitTicket({ subject: f.subject.trim(), category: f.category, message: f.message.trim() }),
    onSuccess: () => { setSent(true); setF({ subject: '', category: 'General', message: '' }) },
    onError: (e) => toast(e.response?.data?.message ?? 'Could not send your request', { tone: 'warn' }),
  })
  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Help & support" sub="Ask a question or report a problem — the Mzobs team replies by email." />
        {sent ? (
          <View style={{ alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: C.okLine, backgroundColor: C.okSoft, padding: 24 }}>
            <LifeBuoy size={24} color={C.okText} />
            <T s={17} w="b">Request received</T>
            <T s={13.5} c={C.ink2}>We’ll get back to you soon.</T>
            <Btn variant="primary" onPress={() => setSent(false)} style={{ marginTop: 8 }}>Send another</Btn>
          </View>
        ) : (
          <View style={[card, { padding: 20, gap: 16 }]}>
            <Field label="Topic"><Select value={f.category} onChange={(category) => set({ category })} options={TICKET_CATEGORIES} title="Topic" /></Field>
            <Field label="Subject"><Input value={f.subject} onChangeText={(subject) => set({ subject })} placeholder="What do you need help with?" /></Field>
            <Field label="Message"><Input value={f.message} onChangeText={(message) => set({ message })} multiline style={{ minHeight: 150 }} placeholder="Describe the issue — include the job or candidate if it’s about one." /></Field>
            <Pressable onPress={() => Linking.openURL('mailto:hello@mzobs.com')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 }}>
              <Mail size={14} color={C.accent} />
              <T s={13} w="m" c={C.accent}>Or email hello@mzobs.com</T>
            </Pressable>
            <Btn variant="primary" disabled={!valid} loading={send.isPending} onPress={() => send.mutate()}>Send request</Btn>
          </View>
        )}
      </PageScroll>
    </Shell>
  )
}

// Permanent, in-app account deletion (required by Google Play). The backend refuses when this
// person is the only admin and the team still has members, and the message says what to do.
function DeleteAccount() {
  const { logout } = useAuth()
  const { toast } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const close = () => { if (!busy) { setOpen(false); setConfirm(''); setError('') } }
  const run = async () => {
    setBusy(true)
    setError('')
    try {
      await deleteAccount()
      toast('Your account has been deleted')
      await logout()
    } catch (e) {
      setError(e.response?.data?.message ?? 'Couldn’t delete your account. Please try again.')
      setBusy(false)
    }
  }
  return (
    <>
      <View style={[card, { padding: 20, gap: 10 }]}>
        <T s={15} w="s">Delete account</T>
        <T s={13} c={C.muted}>Permanently delete your Mzobs employer account and personal details. This can’t be undone.</T>
        <Btn icon={Trash2} onPress={() => setOpen(true)} textStyle={{ color: C.bad }} style={{ alignSelf: 'flex-start' }}>Delete my account</Btn>
      </View>
      <Sheet
        open={open}
        onClose={close}
        title="Delete your account?"
        footer={<><Btn onPress={close} disabled={busy}>Cancel</Btn><Btn variant="primary" loading={busy} disabled={confirm.trim() !== 'DELETE'} onPress={run}>Delete permanently</Btn></>}
      >
        <View style={{ gap: 12 }}>
          <T s={13.5} c={C.ink2}>This permanently removes your name, email, phone number and support tickets.</T>
          <T s={13.5} c={C.ink2}>If you are the only person on your company account, the company is closed too: open jobs are closed and the company profile is cleared.</T>
          <T s={13.5} c={C.ink2}>Payment, invoice and plan records, and the hiring history of candidates you contacted or unlocked, are kept for tax and audit purposes.</T>
          <Field label="Type DELETE to confirm">
            <Input value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" />
          </Field>
          {error ? <T s={12.5} c={C.bad}>{error}</T> : null}
        </View>
      </Sheet>
    </>
  )
}

export function SettingsScreen() {
  const nav = useNavigation()
  const { user, company } = useAuth()
  const signOut = useSignOut()
  const row = (label, value) => (
    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line2 }}>
      <T s={13} c={C.muted}>{label}</T>
      <T s={14} w="m" style={{ flexShrink: 1, textAlign: 'right' }}>{value || '—'}</T>
    </View>
  )
  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Recruiter settings" sub="Your account and workspace." />
        <View style={[card, { padding: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}><Cog size={15} color={C.muted} /><T s={15} w="s">Account</T></View>
          {row('Name', user?.name)}
          {row('Email', user?.email)}
          {row('Role', user?.role)}
          {row('Company', company?.name)}
        </View>
        <View style={[card, { padding: 20, gap: 12 }]}>
          <T s={15} w="s">Quick links</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Btn icon={CreditCard} onPress={() => nav.navigate('PlanCredits')}>Plan & credits</Btn>
            <Btn icon={Bell} onPress={() => nav.navigate('Notifications')}>Notifications</Btn>
            <Btn icon={HelpCircle} onPress={() => nav.navigate('Help')}>Help & support</Btn>
          </View>
        </View>
        <View style={[card, { padding: 20, gap: 12 }]}>
          <T s={15} w="s">Employer account</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Btn icon={FileText} onPress={() => nav.navigate('Offers')}>Offers</Btn>
            <Btn icon={Users} onPress={() => nav.navigate('Team')}>Team</Btn>
            <Btn icon={Building2} onPress={() => nav.navigate('Company')}>Company profile</Btn>
          </View>
        </View>
        <Btn icon={LogOut} onPress={signOut} style={{ alignSelf: 'flex-start' }}>Sign out</Btn>
        <DeleteAccount />
        <T s={12} c={C.muted}>Password and profile changes are managed from your Mzobs employer account. <T s={12} c={C.accent} onPress={() => nav.navigate('Help')}>Need help?</T></T>
      </PageScroll>
    </Shell>
  )
}
