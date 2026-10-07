// Subscription + CV credits (same endpoints as the website's planService), plus the live plan
// snapshot shared by the nav pill, job form and unlock sheet. Checkout uses the native
// Razorpay module (a dev/production build; not available in Expo Go).
import { apiClient } from '../lib/api'
import { openRazorpayCheckout } from '../lib/razorpay'
import { getCredits, getSubscription, purchaseCredits as buyCredits, purchasePlan as buyPlan } from './billingService'

export { getSubscription, getCredits as getWallet, getCreditPlans as getPlans, listPurchases, submitPlanEnquiry, previewCreditCoupon as previewCoupon, previewPlanCoupon as previewSubscriptionCoupon } from './billingService'
export const listPlanPayments = () => apiClient.get('/payments', { params: { limit: 50 } }).then((r) => r.data)
export const listUnlockHistory = () => apiClient.get('/unlocks', { params: { limit: 50 } }).then((r) => r.data)

let snapshot = null
const listeners = new Set()

/** { active, planName, expiresAt, credits } — null until first load. */
export const getPlanSnapshot = () => snapshot
export function subscribePlan(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Reloads subscription + wallet and notifies listeners (call after any purchase or unlock). */
export async function refreshPlan() {
  try {
    const [sub, wallet] = await Promise.all([getSubscription(), getCredits()])
    snapshot = {
      active: !!sub.isActive,
      planName: sub.subscription?.planName ?? null,
      expiresAt: sub.subscription?.expiresAt ?? null,
      credits: wallet.wallet?.remainingCredits ?? 0,
    }
  } catch {
    snapshot = null
  }
  listeners.forEach((fn) => fn(snapshot))
  return snapshot
}

export const purchaseSubscription = async (planCode, couponCode) => {
  await buyPlan(planCode, couponCode, openRazorpayCheckout)
  return refreshPlan()
}
export const purchaseCredits = async (planId, couponCode) => {
  await buyCredits(planId, couponCode, openRazorpayCheckout)
  return refreshPlan()
}
export const paymentError = (e) => e?.description ?? e?.response?.data?.message ?? e?.message ?? 'Payment failed'
export const isCancel = (e) => e?.code === 0 || e?.code === 2 || e?.message === 'Payment cancelled'
