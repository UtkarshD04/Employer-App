// iOS in-app purchases (App Store rules require them for digital goods) via StoreKit (expo-iap).
// Required lazily — like razorpay.js, the native module isn't in Expo Go. After a purchase the
// app sends Apple's signed transaction to POST /payments/apple, where the backend verifies it
// against Apple's root certificate and grants the plan / credits (Backend/src/utils/appleIap.js).
import { Platform } from 'react-native'

export const iapEnabled = Platform.OS === 'ios'

let sdk = null
let connecting = null

function load() {
  if (!sdk) sdk = require('expo-iap')
  return sdk
}

async function ready() {
  const iap = load()
  if (!connecting) {
    connecting = iap.initConnection().catch((e) => {
      connecting = null
      throw e
    })
  }
  await connecting
  return iap
}

/** { [productId]: '₹1,179.00' } — the price Apple will actually charge. Empty when unavailable. */
export async function getStorePrices(productIds) {
  try {
    const iap = await ready()
    const products = await iap.fetchProducts({ skus: productIds.filter(Boolean), type: 'in-app' })
    return Object.fromEntries((products ?? []).map((p) => [p.id, p.displayPrice]))
  } catch {
    return {}
  }
}

/**
 * Opens Apple's payment sheet. Resolves with the signed transaction (JWS) for the backend,
 * plus `finish()` to call once the backend has granted the purchase. Rejects { code: 0 } on
 * cancel, { description } otherwise. Credit packs are consumable, annual plans are not.
 */
export async function buyProduct(productId, { consumable = false } = {}) {
  let iap
  try {
    iap = await ready()
  } catch {
    throw { code: 'UNAVAILABLE', description: 'The App Store isn’t available right now. Please try again later.' }
  }
  return new Promise((resolve, reject) => {
    let done = false
    const finish = (fn) => (arg) => {
      if (done) return
      done = true
      updated.remove()
      failed.remove()
      fn(arg)
    }
    // StoreKit also replays unfinished transactions through this listener; only react to ours.
    const updated = iap.purchaseUpdatedListener((purchase) => {
      if (purchase?.productId === productId && purchase.purchaseToken) onPurchase(purchase)
    })
    const onPurchase = finish((purchase) => resolve({ signedTransaction: purchase.purchaseToken, finish: () => iap.finishTransaction({ purchase, isConsumable: consumable }) }))
    const failed = iap.purchaseErrorListener(
      finish((error) =>
        reject(error?.code === 'user-cancelled' ? { code: 0, description: 'Payment cancelled' } : { code: 'STORE', description: error?.message ?? 'The App Store purchase failed.' }),
      ),
    )
    iap.requestPurchase({ request: { apple: { sku: productId } }, type: 'in-app' }).catch(finish((e) => reject({ code: 'STORE', description: e?.message ?? 'The App Store purchase failed.' })))
  })
}
