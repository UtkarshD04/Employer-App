// A CV credit buys a candidate once; email, phone and CV are then each opened
// with their own click (the API's `revealed` list). `_live.unlocked` means the
// credit is spent, `_live.revealed` says which parts are actually open.
export const PARTS = ['email', 'phone', 'resume']
export const PART_LABEL = { email: 'email', phone: 'phone number', resume: 'CV' }

/** From an API row: `revealed` when the backend sends it, otherwise (older backend) an unlocked row has everything open. */
export function revealedFromApi(row) {
  if (!row?.unlocked) return []
  return Array.isArray(row.revealed) ? row.revealed : [...PARTS]
}

export const isRevealed = (c, part) => !!c?._live?.revealed?.includes(part)
/** The credit for this candidate is already spent, so revealing another part is free. */
export const creditSpent = (c) => !!c?._live?.unlocked
