import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Gift, Plus } from 'lucide-react-native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { PickerField } from '../../components/web/ActionModals'
import { ErrorBlock, FadeIn, ListSkeleton, Tabs, fmtDate, useRefresh, ymd } from '../../components/web/rc'
import { Avatar, Btn, C, EmptyState, Field, Input, Select, Sheet, T, card } from '../../components/wk'
import { useWorkspace } from '../../store/workspace'
import { apiMessage, createOffer, listApplicants, listOffers, setOfferStatus, usePermissions } from '../../services/recruiter'

const STATUS = { pending: ['Awaiting response', C.warnSoft, C.warn], draft: ['Draft', C.line2, C.ink2], accepted: ['Accepted', C.okSoft, C.ok], rejected: ['Declined', '#f5e9e7', '#9a3a2c'] }
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`

function NewOffer({ open, presetId, onClose, onCreated }) {
  const { toast } = useWorkspace()
  const [cands, setCands] = useState([])
  const [f, setF] = useState({ candidateId: '', ctc: '', joiningDate: null, expiresOn: null })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setErrors({})
    setF({ candidateId: presetId ?? '', ctc: '', joiningDate: null, expiresOn: null })
    // Offers are made to people already shortlisted or interviewed.
    Promise.all([listApplicants({ jobId: 'all', stage: 'shortlisted' }), listApplicants({ jobId: 'all', stage: 'interview' })])
      .then(([a, b]) => setCands([...a.items, ...b.items].filter((c) => c.jobId)))
      .catch(() => setCands([]))
  }, [open, presetId])
  const chosen = cands.find((c) => c.id === f.candidateId)
  const submit = async () => {
    const e = {}
    if (!chosen) e.candidateId = 'Choose a candidate.'
    if (!(Number(f.ctc) > 0)) e.ctc = 'Enter the annual CTC in rupees.'
    if (!f.joiningDate) e.joiningDate = 'Pick a joining date.'
    if (!f.expiresOn) e.expiresOn = 'Pick when the offer expires.'
    else if (f.joiningDate && ymd(f.expiresOn) > ymd(f.joiningDate)) e.expiresOn = 'The offer should expire on or before the joining date.'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      await createOffer({ candidateId: chosen.id, jobId: chosen.jobId, role: chosen.jobTitle || chosen.appliedFor, ctc: Number(f.ctc), joiningDate: ymd(f.joiningDate), expiresOn: ymd(f.expiresOn) })
      toast(`Offer created for ${chosen.name}`)
      onCreated()
      onClose()
    } catch (err) {
      setErrors({ form: apiMessage(err) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open={open} onClose={busy ? () => {} : onClose} title="Create an offer" footer={<><Btn onPress={onClose} disabled={busy}>Cancel</Btn><Btn variant="primary" onPress={submit} loading={busy}>Create offer</Btn></>}>
      <View style={{ gap: 16 }}>
        <Field label="Candidate" error={errors.candidateId} hint={cands.length === 0 ? 'Only shortlisted or interviewed candidates appear here.' : undefined}>
          <Select value={f.candidateId} title="Candidate" placeholder="Choose…" error={errors.candidateId} onChange={(v) => setF((x) => ({ ...x, candidateId: v }))} options={cands.map((c) => [c.id, `${c.name} — ${c.jobTitle}`])} />
        </Field>
        <Field label="Annual CTC (₹)" error={errors.ctc}><Input value={f.ctc} onChangeText={(v) => setF((x) => ({ ...x, ctc: v.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" error={errors.ctc} /></Field>
        <Field label="Joining date" error={errors.joiningDate}><PickerField mode="date" value={f.joiningDate} placeholder="Pick a date" minimumDate={new Date()} onChange={(d) => setF((x) => ({ ...x, joiningDate: d }))} /></Field>
        <Field label="Offer expires on" error={errors.expiresOn}><PickerField mode="date" value={f.expiresOn} placeholder="Pick a date" minimumDate={new Date()} onChange={(d) => setF((x) => ({ ...x, expiresOn: d }))} /></Field>
        {errors.form ? <T s={13} w="m" c={C.bad}>{errors.form}</T> : null}
      </View>
    </Sheet>
  )
}

export default function OffersScreen({ route }) {
  const nav = useNavigation()
  const { toast } = useWorkspace()
  const { can } = usePermissions()
  const preset = route.params?.candidate
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(!!preset)
  const load = useCallback(() => {
    setError('')
    return listOffers().then(setRows).catch((e) => setError(apiMessage(e, 'Could not load offers.')))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (preset) setCreating(true) }, [preset])

  const { refreshing, onRefresh } = useRefresh(load)
  const [tab, setTab] = useState('all')
  const sorted = useMemo(() => (rows ?? []).filter((o) => tab === 'all' || o.status === tab).sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || new Date(a.expiresOn) - new Date(b.expiresOn)), [rows, tab])
  const countOf = (st) => (rows ?? []).filter((o) => o.status === st).length
  const respond = (o, status) =>
    Alert.alert(`Mark ${o.candidateName}’s offer as ${status === 'accepted' ? 'accepted' : 'declined'}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await setOfferStatus(o.id, status)
            toast('Offer updated')
            load()
          } catch (e) {
            toast(apiMessage(e), { tone: 'warn' })
          }
        },
      },
    ])
  const closeNew = () => {
    setCreating(false)
    if (preset) nav.setParams({ candidate: undefined })
  }

  return (
    <Shell>
      <PageScroll onRefresh={onRefresh} refreshing={refreshing}>
        <PageTitle title="Offers" sub="Offers you have made and where each one stands." />
        {can('offers.manage') ? <Btn variant="primary" icon={Plus} onPress={() => setCreating(true)} style={{ alignSelf: 'flex-start' }}>Create offer</Btn> : null}
        {rows && rows.length > 0 ? <Tabs value={tab} onChange={setTab} tabs={[['all', `All (${rows.length})`], ['pending', `Awaiting (${countOf('pending')})`], ['accepted', `Accepted (${countOf('accepted')})`], ['rejected', `Declined (${countOf('rejected')})`]]} /> : null}
        {error ? <ErrorBlock message={error} onRetry={load} /> : !rows ? <ListSkeleton h={110} /> : sorted.length === 0 ? (
          <EmptyState icon={Gift} title={rows.length ? 'No offers in this tab' : 'No offers yet'} body={rows.length ? 'Try another tab.' : 'When a candidate is shortlisted or interviewed, create an offer here. They are notified and you can track their response.'} action={!rows.length && can('offers.manage') ? <Btn variant="primary" size="sm" icon={Plus} onPress={() => setCreating(true)}>Create offer</Btn> : undefined} />
        ) : (
          <View style={{ gap: 10 }}>
            {sorted.map((o, k) => {
              const [label, bg, fg] = STATUS[o.status] ?? STATUS.draft
              const soon = o.status === 'pending' && new Date(o.expiresOn) - Date.now() < 3 * 86400000
              return (
                <FadeIn key={o.id} index={k}><View style={[card, { padding: 14, gap: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar candidate={{ id: o.id, initials: o.initials }} size={34} />
                    <View style={{ flex: 1 }}>
                      <T s={14.5} w="b" numberOfLines={1}>{o.candidateName}</T>
                      <T s={12.5} c={C.muted} numberOfLines={1}>{o.role}</T>
                    </View>
                    <View style={{ borderRadius: 5, backgroundColor: bg, paddingHorizontal: 6, paddingVertical: 2 }}><T s={11.5} w="s" c={fg}>{label}</T></View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 2 }}>
                    <T s={13} w="s">{inr(o.ctc)}</T>
                    <T s={12.5} c={C.ink2}>Joining {fmtDate(o.joiningDate)}</T>
                    <T s={12.5} w={soon ? 's' : 'r'} c={soon ? C.warn : C.ink2}>Expires {fmtDate(o.expiresOn)}{soon && new Date(o.expiresOn) < new Date() ? ' (expired)' : ''}</T>
                  </View>
                  {o.status === 'pending' && can('offers.manage') ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Btn size="sm" onPress={() => respond(o, 'accepted')}>Accepted</Btn>
                      <Btn size="sm" variant="ghost" onPress={() => respond(o, 'rejected')}>Declined</Btn>
                    </View>
                  ) : null}
                </View></FadeIn>
              )
            })}
          </View>
        )}
      </PageScroll>
      <NewOffer open={creating} presetId={preset} onClose={closeNew} onCreated={load} />
    </Shell>
  )
}
