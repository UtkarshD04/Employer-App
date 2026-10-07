import { useCallback, useEffect, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { AlertTriangle, CheckCircle2, Coins, CreditCard, ShieldCheck, SlidersHorizontal, Tag, Ticket, XCircle } from 'lucide-react-native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { Btn, C, EmptyState, F, Field, Input, Sheet, Skeleton, T, card } from '../../components/wk'
import { useWorkspace } from '../../store/workspace'
import { agoDate } from '../../lib/tfmt'
import { getPlans, getSubscription, getWallet, isCancel, listPlanPayments, listPurchases, listUnlockHistory, paymentError, previewCoupon, previewSubscriptionCoupon, purchaseCredits, purchaseSubscription, submitPlanEnquiry } from '../../services/plan'

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const dateOf = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const daysLeft = (iso) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null)

function Card({ title, icon: Icon, children, style }) {
  return (
    <View style={[card, { padding: 20 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Icon size={16} color={C.muted} /><T s={15} w="s">{title}</T></View>
      {children}
    </View>
  )
}

function CouponRow({ code, setCode, onApply, label }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <TextInput value={code} onChangeText={(t) => setCode(t)} onSubmitEditing={onApply} autoCapitalize="characters" placeholder="Coupon code" placeholderTextColor={C.ph} accessibilityLabel={label} style={{ flex: 1, minHeight: 40, borderRadius: 8, borderWidth: 1, borderColor: C.line, paddingHorizontal: 10, fontFamily: F.r, fontSize: 13, color: C.ink }} />
      <Btn size="sm" icon={Tag} disabled={!code.trim()} onPress={onApply}>Apply</Btn>
    </View>
  )
}

function TierCard({ plan: p, onBuy, busy }) {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState(null)
  const [err, setErr] = useState('')
  const apply = async () => {
    setErr('')
    setPreview(null)
    if (!code.trim()) return
    try {
      setPreview(await previewSubscriptionCoupon(p.planCode, code.trim()))
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Invalid coupon')
    }
  }
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', padding: 16 }}>
      <T s={13} w="s" c={C.muted} style={{ letterSpacing: 0.6 }}>{String(p.planName).toUpperCase()}</T>
      <T s={26} w="b" style={{ marginTop: 6 }}>{rupees(preview ? preview.finalAmount * 100 : p.totalAmountPaise)}{preview ? <T s={14} w="m" c={C.muted} style={{ textDecorationLine: 'line-through' }}>  {rupees(p.totalAmountPaise)}</T> : null}</T>
      <T s={12} c={C.muted}>{rupees(p.baseAmountPaise)} + GST {p.gstRatePercent}% ({rupees(p.gstAmountPaise)}) · 1 year</T>
      {p.benefits?.length > 0 ? <View style={{ marginTop: 8, gap: 4 }}>{p.benefits.map((b) => <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CheckCircle2 size={13} color={C.okText} /><T s={13} c={C.ink2} style={{ flex: 1 }}>{b}</T></View>)}</View> : null}
      <View style={{ marginTop: 12 }}><CouponRow code={code} setCode={(t) => { setCode(t); setPreview(null) }} onApply={apply} label={`Coupon for ${p.planName}`} /></View>
      {preview ? <T s={12} w="m" c={C.okText} style={{ marginTop: 6 }}>{preview.code} applied — you save ₹{preview.discountAmount.toLocaleString('en-IN')}</T> : null}
      {err ? <T s={12} c={C.bad} style={{ marginTop: 6 }}>{err}</T> : null}
      <Btn variant="primary" loading={busy} onPress={() => onBuy(p, preview?.code)} style={{ marginTop: 14 }}>{`Subscribe · ${rupees(preview ? preview.finalAmount * 100 : p.totalAmountPaise)}`}</Btn>
    </View>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// "Customize plan" — for employers who don't fit the fixed tiers. Submissions go to the
// Operations team (Plan enquiries), who call back with a quote.
function CustomPlanCard() {
  const { toast } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', companyName: '', phone: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: k === 'phone' ? v.replace(/\D/g, '').slice(0, 10) : v }))
  const valid = form.name.trim() && form.companyName.trim() && form.phone.length === 10 && EMAIL_RE.test(form.email.trim())
  const close = () => { if (!busy) { setOpen(false); setError('') } }
  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await submitPlanEnquiry(form)
      setOpen(false)
      setForm({ name: '', companyName: '', phone: '', email: '' })
      toast('Request sent — our team will call you soon')
    } catch (e) {
      setError(e.response?.data?.message ?? 'Couldn’t send your request. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: C.accent, backgroundColor: C.panel, padding: 16 }}>
      <T s={13} w="s" c={C.muted} style={{ letterSpacing: 0.6 }}>CUSTOMIZE PLAN</T>
      <T s={26} w="b" style={{ marginTop: 6 }}>Let’s talk</T>
      <T s={12} c={C.muted}>A plan shaped around your hiring volume and team.</T>
      <Btn icon={SlidersHorizontal} onPress={() => setOpen(true)} style={{ marginTop: 14 }}>Customize plan</Btn>
      <Sheet
        open={open}
        onClose={close}
        title="Customize your plan"
        subtitle="Share your details and our team will get back to you."
        footer={<><Btn onPress={close} disabled={busy}>Cancel</Btn><Btn variant="primary" loading={busy} disabled={!valid} onPress={submit}>Submit</Btn></>}
      >
        <View style={{ gap: 14 }}>
          <Field label="Your name"><Input value={form.name} onChangeText={set('name')} maxLength={120} autoComplete="name" /></Field>
          <Field label="Company name"><Input value={form.companyName} onChangeText={set('companyName')} maxLength={200} /></Field>
          <Field label="Phone number"><Input value={form.phone} onChangeText={set('phone')} keyboardType="number-pad" placeholder="98765 43210" /></Field>
          <Field label="Email"><Input value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={200} /></Field>
          {error ? <T s={12.5} c={C.bad}>{error}</T> : null}
        </View>
      </Sheet>
    </View>
  )
}

function SubscriptionCard({ data, onBuy, busy }) {
  const { subscription: s, isActive } = data
  const left = daysLeft(s?.expiresAt)
  return (
    <Card title="Employer plan" icon={ShieldCheck}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <T s={20} w="b">{s?.planName ?? 'No plan'}</T>
        {isActive ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: C.okSoft, paddingHorizontal: 8, paddingVertical: 2 }}><CheckCircle2 size={12} color={C.okText} /><T s={12} w="s" c={C.okText}>Active</T></View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: C.warnSoft, paddingHorizontal: 8, paddingVertical: 2 }}><XCircle size={12} color={C.warn} /><T s={12} w="s" c={C.warn}>{s?.status === 'expired' ? 'Expired' : 'Not subscribed'}</T></View>
        )}
      </View>
      {isActive ? (
        <T s={13.5} c={C.ink2} style={{ marginTop: 4 }}>Valid until <T s={13.5} w="b">{dateOf(s.expiresAt)}</T>{left != null ? <T s={13.5} c={left <= 30 ? C.warn : C.muted}> ({left} day{left === 1 ? '' : 's'} left)</T> : null}</T>
      ) : (
        <T s={13.5} c={C.ink2} style={{ marginTop: 4 }}>Needed to <T s={13.5} w="b">post jobs</T> and <T s={13.5} w="b">open candidate resumes</T>. Contact details are unlocked separately with CV credits. Choose a plan below.</T>
      )}
      {!isActive ? (
        <View style={{ marginTop: 16, gap: 16 }}>
          {(data.plans ?? []).map((p) => <TierCard key={p.planCode} plan={p} busy={busy === p.planCode} onBuy={onBuy} />)}
          {!(data.plans ?? []).length ? <T s={13} c={C.muted}>Plans are not available from the server right now.</T> : null}
          <CustomPlanCard />
        </View>
      ) : (
        <View style={{ marginTop: 16 }}><CustomPlanCard /></View>
      )}
    </Card>
  )
}

function CreditsCard({ wallet, rate }) {
  const total = wallet.totalCredits ?? 0
  const used = wallet.usedCredits ?? 0
  const left = wallet.remainingCredits ?? 0
  const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 0
  const exp = daysLeft(wallet.expiresAt)
  const low = total > 0 && left <= Math.max(3, total * 0.1)
  return (
    <Card title="CV credits" icon={Coins}>
      <T s={42} w="b" style={{ lineHeight: 46 }}>{left}</T>
      <T s={13} c={C.muted}>credits remaining · 1 credit unlocks one candidate’s contact details{rate ? ` (₹${rate} each)` : ''}</T>
      <View style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T s={13} c={C.muted}>{used} used</T><T s={13} c={C.muted}>{total} total</T></View>
        <View style={{ marginTop: 4, height: 8, borderRadius: 4, backgroundColor: C.line2, overflow: 'hidden' }}><View style={{ height: 8, borderRadius: 4, width: `${pct}%`, backgroundColor: low ? C.warn : C.accent }} /></View>
        {wallet.expiresAt ? <T s={12} c={exp != null && exp <= 30 ? C.warn : C.muted} style={{ marginTop: 6 }}>Credits valid until {dateOf(wallet.expiresAt)}{exp != null ? ` (${exp} days)` : ''}</T> : null}
      </View>
      {left === 0 || low ? (
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8, borderRadius: 8, backgroundColor: C.warnSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
          <AlertTriangle size={14} color={C.warn} style={{ marginTop: 2 }} />
          <T s={13} c={C.warn} style={{ flex: 1 }}>{left === 0 ? 'You have no credits. Buy a pack below to unlock candidate contact details.' : 'Running low — top up so you can keep unlocking candidates.'}</T>
        </View>
      ) : null}
    </Card>
  )
}

function PackCard({ plan, onBuy, busy }) {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState(null)
  const [err, setErr] = useState('')
  const apply = async () => {
    setErr('')
    setPreview(null)
    if (!code.trim()) return
    try {
      setPreview(await previewCoupon(plan.id, code.trim()))
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Invalid coupon')
    }
  }
  const price = preview ? preview.finalAmount : plan.amountRupees
  return (
    <View style={[card, { padding: 20 }]}>
      <T s={13} w="s" c={C.muted} style={{ letterSpacing: 0.6 }}>{String(plan.name).toUpperCase()}</T>
      <T s={30} w="b" style={{ marginTop: 6 }}>{plan.creditsGranted}<T s={14} w="m" c={C.muted}> credits</T></T>
      <T s={22} w="b" style={{ marginTop: 4 }}>₹{price.toLocaleString('en-IN')}{preview ? <T s={14} w="m" c={C.muted} style={{ textDecorationLine: 'line-through' }}>  ₹{plan.amountRupees.toLocaleString('en-IN')}</T> : null}</T>
      <T s={12} c={C.muted}>₹{plan.rupeesPerCredit} per credit</T>
      <View style={{ marginTop: 16 }}><CouponRow code={code} setCode={(t) => { setCode(t); setPreview(null) }} onApply={apply} label={`Coupon for ${plan.name}`} /></View>
      {preview ? <T s={12} w="m" c={C.okText} style={{ marginTop: 6 }}>{preview.code} applied — you save ₹{preview.discountAmount.toLocaleString('en-IN')}</T> : null}
      {err ? <T s={12} c={C.bad} style={{ marginTop: 6 }}>{err}</T> : null}
      <Btn variant="primary" loading={busy} onPress={() => onBuy(plan, preview?.code)} style={{ marginTop: 16 }}>{`Buy ${plan.creditsGranted} credits`}</Btn>
    </View>
  )
}

const TABS = ['Credit purchases', 'Unlocks', 'Plan payments']

function History() {
  const [tab, setTab] = useState(0)
  const [rows, setRows] = useState({})
  useEffect(() => {
    const fn = [listPurchases, listUnlockHistory, listPlanPayments][tab]
    if (rows[tab] === undefined) fn().then((r) => setRows((x) => ({ ...x, [tab]: r }))).catch(() => setRows((x) => ({ ...x, [tab]: [] })))
  }, [tab, rows])
  const list = rows[tab]
  return (
    <Card title="History" icon={CreditCard}>
      <View style={{ flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
        {TABS.map((t, i) => (
          <Pressable key={t} onPress={() => setTab(i)} style={{ marginBottom: -1, minHeight: 40, justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: tab === i ? C.accent : 'transparent' }}>
            <T s={12.5} w="m" c={tab === i ? C.ink : C.muted}>{t}</T>
          </Pressable>
        ))}
      </View>
      {list === undefined ? <Skeleton h={64} /> : list.length === 0 ? (
        <T s={13} c={C.muted} style={{ textAlign: 'center', paddingVertical: 24 }}>Nothing here yet.</T>
      ) : (
        list.map((r, idx) => (
          <View key={r.id} style={{ paddingVertical: 10, borderTopWidth: idx ? 1 : 0, borderTopColor: C.line2, flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            {tab === 1 ? (
              <>
                <T s={13.5} style={{ flex: 1 }}><T s={13.5} w="m">{r.candidate?.name ?? 'Candidate'}</T><T s={13.5} c={C.muted}> · {r.job?.title ?? r.candidate?.appliedFor ?? ''}</T></T>
                <T s={12} c={C.muted}>{agoDate(r.createdAt)} · 1 credit</T>
              </>
            ) : (
              <>
                <T s={13.5} style={{ flex: 1 }}>{tab === 0 ? `${r.creditPlan?.name ?? 'Credit pack'} · ${r.creditsGranted ?? r.creditPlan?.creditsGranted ?? ''} credits` : 'Employer annual plan'}<T s={13.5} c={C.muted}> · {agoDate(r.createdAt)}</T></T>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <T s={13.5} w="m">₹{Number(r.amount).toLocaleString('en-IN')}</T>
                  <View style={{ borderRadius: 4, backgroundColor: r.status === 'paid' ? C.okSoft : C.line2, paddingHorizontal: 6, paddingVertical: 1 }}><T s={11} w="s" c={r.status === 'paid' ? C.okText : C.muted}>{r.status}</T></View>
                </View>
              </>
            )}
          </View>
        ))
      )}
    </Card>
  )
}

export default function PlanCreditsScreen() {
  const { toast } = useWorkspace()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const [sub, w, plans] = await Promise.all([getSubscription(), getWallet(), getPlans()])
      setData({ sub, wallet: w.wallet, rate: w.rupeesPerCredit, plans: plans.plans })
      setError(false)
    } catch {
      setError(true)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (key, fn, ok) => {
    setBusy(key)
    try {
      await fn()
      toast(ok)
      await load()
    } catch (e) {
      if (!isCancel(e)) toast(paymentError(e), { tone: 'warn' })
    } finally {
      setBusy('')
    }
  }

  return (
    <Shell>
      <PageScroll>
        <PageTitle title="Plan & credits" sub="Your employer plan unlocks posting and resumes; CV credits unlock candidate contact details." />
        {error ? (
          <EmptyState icon={CreditCard} title="Couldn’t load your plan" action={<Btn onPress={load}>Retry</Btn>} />
        ) : !data ? (
          <View style={{ gap: 20 }}><Skeleton h={128} r={16} /><Skeleton h={128} r={16} /></View>
        ) : (
          <>
            <SubscriptionCard data={data.sub} busy={busy} onBuy={(plan, code) => run(plan.planCode, () => purchaseSubscription(plan.planCode, code), `${plan.planName} activated`)} />
            <CreditsCard wallet={data.wallet} rate={data.rate} />
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ticket size={16} color={C.muted} /><T s={15} w="s">Buy CV credits</T></View>
              {data.plans.length === 0 ? <T s={13} c={C.muted}>No credit packs are available right now.</T> : (
                <View style={{ gap: 16 }}>{data.plans.map((p) => <PackCard key={p.id} plan={p} busy={busy === p.id} onBuy={(plan, code) => run(plan.id, () => purchaseCredits(plan.id, code), `${plan.creditsGranted} credits added`)} />)}</View>
              )}
            </View>
            <History />
          </>
        )}
      </PageScroll>
    </Shell>
  )
}
