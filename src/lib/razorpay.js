// Native Razorpay Checkout (needs a dev/production build — the native module isn't in Expo Go).
// It's required lazily: react-native-razorpay touches its native module the moment it is
// imported, so a top-level import would crash the whole app on start wherever it isn't linked.
// Resolves { razorpay_payment_id, razorpay_order_id, razorpay_signature }; rejects with
// { code, description } — code 0 is a user-initiated cancel.
export function openRazorpayCheckout(order) {
  let RazorpayCheckout
  try {
    RazorpayCheckout = require('react-native-razorpay').default
  } catch {
    return Promise.reject({ code: 'UNAVAILABLE', description: 'Payments need the full app build. They aren’t available in Expo Go.' })
  }
  if (!RazorpayCheckout?.open) return Promise.reject({ code: 'UNAVAILABLE', description: 'Payments need the full app build. They aren’t available in Expo Go.' })
  return RazorpayCheckout.open({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name: order.name,
    description: order.description,
    prefill: order.prefill,
    theme: { color: '#123B5D' },
  })
}

export const isCheckoutCancel = (err) => err?.code === 0 || err?.code === 2
