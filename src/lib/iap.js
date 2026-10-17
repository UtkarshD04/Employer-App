// iOS in-app purchases (App Store rules require them for digital goods) via RevenueCat.
// Required lazily — like razorpay.js, the native module isn't in Expo Go. RevenueCat's
// webhook tells our backend about each purchase; the buyer is the company id.
import { Platform } from 'react-native'

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ''

export const iapEnabled = Platform.OS === 'ios'

let sdk = null
let configured = false
let loggedInAs = null

function load() {
  if (!sdk) sdk = require('react-native-purchases')
  return sdk
}

async function ready(companyId) {
  if (!IOS_KEY) throw { code: 'UNAVAILABLE', description: 'Purchases aren’t available in this build.' }
  const { default: Purchases } = load()
  if (!configured) {
    Purchases.configure({ apiKey: IOS_KEY })
    configured = true
  }
  if (companyId && loggedInAs !== companyId) {
    await Purchases.logIn(String(companyId))
    loggedInAs = companyId
  }
  return Purchases
}

/** { [productId]: '₹1,179.00' } — the price Apple will actually charge. Empty when unavailable. */
export async function getStorePrices(productIds) {
  try {
    const Purchases = await ready()
    const { PURCHASE_TYPE } = load()
    const products = await Purchases.getProducts(productIds.filter(Boolean), PURCHASE_TYPE.INAPP)
    return Object.fromEntries(products.map((p) => [p.identifier, p.priceString]))
  } catch {
    return {}
  }
}

/** Opens Apple's payment sheet. Rejects { code: 0 } on cancel, { description } otherwise. */
export async function buyProduct(productId, companyId) {
  const Purchases = await ready(companyId)
  const { PURCHASE_TYPE } = load()
  const [product] = await Purchases.getProducts([productId], PURCHASE_TYPE.INAPP)
  if (!product) throw { code: 'UNAVAILABLE', description: 'This item isn’t available on the App Store right now. Please try again later.' }
  try {
    await Purchases.purchaseStoreProduct(product)
  } catch (e) {
    if (e?.userCancelled) throw { code: 0, description: 'Payment cancelled' }
    throw { code: 'STORE', description: e?.message ?? 'The App Store purchase failed.' }
  }
}

export async function restorePurchases(companyId) {
  const Purchases = await ready(companyId)
  await Purchases.restorePurchases()
}
