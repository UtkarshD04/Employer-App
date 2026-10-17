import { useCallback, useEffect, useState } from 'react'
import { Linking, Pressable, TextInput, View } from 'react-native'
import { AlertTriangle, CheckCircle2, Coins, CreditCard, ShieldCheck, SlidersHorizontal, Tag, XCircle } from 'lucide-react-native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import { Btn, C, EmptyState, F, Field, Input, Sheet, Skeleton, T, card } from '../../components/wk'
import { useWorkspace } from '../../store/workspace'
import { useAuth } from '../../context/AuthContext'
import { getStorePrices, iapEnabled, restorePurchases } from '../../lib/iap'
import { agoDate } from '../../lib/tfmt'
import { getSubscription, getWallet, isCancel, listPlanPayments, listPurchases, listUnlockHistory, paymentError, previewSubscriptionCoupon, purchaseSubscription, refreshPlan, submitPlanEnquiry } from '../../services/plan'

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

function TierCard({ plan: p, onBuy, busy, storePrice, upgrade }) {
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
      <T s={26} w="b" style={{ marginTop: 6 }}>{iapEnabled ? storePrice ?? '—' : rupees(preview ? preview.finalAmount * 100 : p.totalAmountPaise)}{preview ? <T s={14} w="m" c={C.muted} style={{ textDecorationLine: 'line-through' }}>  {rupees(p.totalAmountPaise)}</T> : null}</T>
      <T s={12} c={C.muted}>{iapEnabled ? 'One-time purchase · valid for 1 year · does not auto-renew' : `${rupees(p.baseAmountPaise)} + GST ${p.gstRatePercent}% (${rupees(p.gstAmountPaise)}) · 1 year`}</T>
      {p.benefits?.length > 0 ? <View style={{ marginTop: 8, gap: 4 }}>{p.benefits.map((b) => <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CheckCircle2 size={13} color={C.okText} /><T s={13} c={C.ink2} style={{ flex: 1 }}>{b}</T></View>)}</View> : null}
      {iapEnabled ? null : <View style={{ marginTop: 12 }}><CouponRow code={code} setCode={(t) => { setCode(t); setPreview(null) }} onApply={apply} label={`Coupon for ${p.planName}`} /></View>}
      {preview ? <T s={12} w="m" c={C.okText} style={{ marginTop: 6 }}>{preview.code} applied — you save ₹{preview.discountAmount.toLocaleString('en-IN')}</T> : null}
      {err ? <T s={12} c={C.bad} style={{ marginTop: 6 }}>{err}</T> : null}
      <Btn variant="primary" loading={busy} onPress={() => onBuy(p, preview?.code)} style={{ marginTop: 14 }}>{iapEnabled ? `${upgrade ? 'Upgrade' : 'Buy plan'}${storePrice ? ` · ${storePrice}` : ''}` : `${upgrade ? 'Upgrade' : 'Subscribe'} · ${rupees(preview ? preview.finalAmount * 100 : p.totalAmountPaise)}`}</Btn>
    </View>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// "Customize plan" — for employers who don't fit the fixed tiers. Submissions go to the
// Operations team (Plan enquiries), who call back with a quote.
function CustomPlanCard() {
  const { user, company } = useAuth()
  const blank = () => ({ name: user?.name ?? '', companyName: company?.name ?? '', phone: '', email: user?.email ?? '', employeesNeeded: '' })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [status, setStatus] = useState('form') // form | sending | done
  const [error, setError] = useState('')
  const busy = status === 'sending'
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: k === 'phone' ? v.replace(/\D/g, '').slice(0, 10) : k === 'employeesNeeded' ? v.replace(/\D/g, '').slice(0, 6) : v }))
  const valid = form.name.trim() && form.companyName.trim() && form.phone.length === 10 && Number(form.employeesNeeded) >= 1 && EMAIL_RE.test(form.email.trim())
  const close = () => {
    if (busy) return
    setOpen(false)
    setForm(blank())
    setStatus('form')
    setError('')
  }
  const submit = async () => {
    setStatus('sending')
    setError('')
    try {
      await submitPlanEnquiry(form)
      setStatus('done')
    } catch (e) {
      setError(e.response?.data?.message ?? 'Couldn’t send your request. Please try again.')
      setStatus('form')
    }
  }
  const done = status === 'done'
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: C.accent, backgroundColor: C.panel, padding: 16 }}>
      <T s={13} w="s" c={C.muted} style={{ letterSpacing: 0.6 }}>CUSTOMIZE PLAN</T>
      <T s={26} w="b" style={{ marginTop: 6 }}>Let’s talk</T>
      <T s={12} c={C.muted}>A plan shaped around your hiring volume and team.</T>
      <Btn icon={SlidersHorizontal} onPress={() => setOpen(true)} style={{ marginTop: 14 }}>Customize plan</Btn>
      <Sheet
        open={open}
        onClose={close}
        title={done ? undefined : 'Customize your plan'}
        subtitle={done ? undefined : 'Tell us how to reach you and our team will get back with a plan that fits.'}
        footer={done ? <Btn variant="primary" onPress={close} style={{ flex: 1 }}>Done</Btn> : <Btn variant="primary" loading={busy} disabled={!valid} onPress={submit} style={{ flex: 1 }}>{busy ? 'Sending…' : 'Submit'}</Btn>}
      >
        {done ? (
          <View style={{ alignItems: 'center', paddingVertical: 12, gap: 8 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={28} color={C.accent} /></View>
            <T s={22} w="b">We’ll call you soon.</T>
            <T s={13} c={C.muted} style={{ textAlign: 'center' }}>Thanks! Our team has your details and will reach out with a plan built for your hiring needs.</T>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {error ? <T s={12.5} c={C.bad}>{error}</T> : null}
            <Field label="Your name"><Input value={form.name} onChangeText={set('name')} maxLength={120} autoComplete="name" /></Field>
            <Field label="Company name"><Input value={form.companyName} onChangeText={set('companyName')} maxLength={200} autoComplete="organization" /></Field>
            <Field label="Phone number"><Input value={form.phone} onChangeText={set('phone')} keyboardType="number-pad" placeholder="98765 43210" autoComplete="tel-national" /></Field>
            <Field label="Number of employees you need"><Input value={form.employeesNeeded} onChangeText={set('employeesNeeded')} keyboardType="number-pad" placeholder="e.g. 10" /></Field>
            <Field label="Email"><Input value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={200} /></Field>
          </View>
        )}
      </Sheet>
    </View>
  )
}

function SubscriptionCard({ data, onBuy, busy, prices }) {
  const { subscription: s, isActive } = data
  const left = daysLeft(s?.expiresAt)
  const tiers = data.plans ?? []
  const currentBase = isActive ? tiers.find((p) => p.planCode === s?.planCode)?.baseAmountPaise ?? Infinity : -1
  const upgrades = tiers.filter((p) => p.baseAmountPaise > currentBase)
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
      <View style={{ marginTop: 16, gap: 16 }}>
        {isActive && upgrades.length > 0 ? <T s={14} w="s">Upgrade your plan</T> : null}
        {upgrades.map((p) => <TierCard key={p.planCode} plan={p} busy={busy === p.planCode} onBuy={onBuy} storePrice={prices[p.appleProductId]} upgrade={isActive} />)}
        {isActive && upgrades.length === 0 ? <T s={13} c={C.muted}>You’re on our highest plan.</T> : null}
        {!isActive && upgrades.length === 0 ? <T s={13} c={C.muted}>Plans are not available from the server right now.</T> : null}
        <CustomPlanCard />
      </View>
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
          <T s={13} c={C.warn} style={{ flex: 1 }}>{left === 0 ? 'You have no credits left. Upgrade your plan to unlock candidate contact details.' : 'Running low — upgrade your plan to keep unlocking candidates.'}</T>
        </View>
      ) : null}
    </Card>
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
  const { company } = useAuth()
  const [data, setData] = useState(null)
  const [prices, setPrices] = useState({})
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const [sub, w] = await Promise.all([getSubscription(), getWallet()])
      setData({ sub, wallet: w.wallet, rate: w.rupeesPerCredit })
      if (iapEnabled) getStorePrices((sub.plans ?? []).map((p) => p.appleProductId)).then(setPrices)
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
            <SubscriptionCard data={data.sub} busy={busy} prices={prices} onBuy={(plan, code) => run(plan.planCode, () => purchaseSubscription(plan, code, company?.id), `${plan.planName} activated`)} />
            <CreditsCard wallet={data.wallet} rate={data.rate} />
            {iapEnabled ? (
              <View style={{ gap: 8, alignItems: 'center' }}>
                <Btn size="sm" loading={busy === 'restore'} onPress={() => run('restore', async () => { await restorePurchases(company?.id); await refreshPlan() }, 'Purchases restored')}>Restore purchases</Btn>
                <T s={12} c={C.muted} style={{ textAlign: 'center' }}>
                  Payment is charged to your Apple ID account. By purchasing you agree to our{' '}
                  <T s={12} c={C.accent} onPress={() => Linking.openURL('https://mzobs.com/terms-of-service')}>Terms</T> and{' '}
                  <T s={12} c={C.accent} onPress={() => Linking.openURL('https://mzobs.com/privacy-policy')}>Privacy Policy</T>.
                </T>
              </View>
            ) : null}
            <History />
          </>
        )}
      </PageScroll>
    </Shell>
  )
}
