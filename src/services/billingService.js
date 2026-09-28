import { apiClient, fetchAll } from '../lib/api'

export const getSubscription = () => apiClient.get('/subscription').then((r) => r.data) // { subscription, isActive, plans }
export const getCredits = () => apiClient.get('/credits').then((r) => r.data) // { wallet, rupeesPerCredit }
export const getCreditPlans = () => apiClient.get('/plans').then((r) => r.data) // { plans, rupeesPerCredit }
export const listPurchases = () => apiClient.get('/credits/purchases', { params: { limit: 50 } }).then((r) => r.data)
export const listUnlocks = () => fetchAll('/unlocks', { limit: 100, maxPages: 10 })

export const previewCreditCoupon = (planId, code) => apiClient.post('/payments/coupon/preview', { planId, code }).then((r) => r.data)
export const previewPlanCoupon = (planCode, code) => apiClient.post('/subscription/coupon/preview', { planCode, code }).then((r) => r.data)

// Order -> native Razorpay checkout -> verify. `order.mock` is only true on a dev backend
// without Razorpay keys, where the backend confirms a simulated payment.
async function pay({ createOrder, mockConfirm, verify, openCheckout }) {
  const order = await createOrder()
  if (order.mock) await mockConfirm({ orderId: order.orderId })
  else await verify(await openCheckout(order))
}

export const purchaseCredits = (planId, couponCode, openCheckout) =>
  pay({
    createOrder: () => apiClient.post('/payments/create-order', { planId, couponCode: couponCode || undefined }).then((r) => r.data),
    mockConfirm: (b) => apiClient.post('/payments/mock-confirm', b),
    verify: (b) => apiClient.post('/payments/verify', b),
    openCheckout,
  })

export const purchasePlan = (planCode, couponCode, openCheckout) =>
  pay({
    createOrder: () => apiClient.post('/subscription/order', { planCode, couponCode: couponCode || undefined }).then((r) => r.data),
    mockConfirm: (b) => apiClient.post('/subscription/mock-confirm', b),
    verify: (b) => apiClient.post('/subscription/verify-payment', b),
    openCheckout,
  })
