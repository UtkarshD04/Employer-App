import { createContext, useContext, useState } from 'react'
import { navigationRef } from '../lib/navigation'
import AskAI from '../components/web/AskAI'

const Ctx = createContext({ open: () => {} })

/** The "Ask Mzobs AI" panel, reachable from any screen (the website opens it with Ctrl+K). */
export function AskAIProvider({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <Ctx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <AskAI open={open} onClose={() => setOpen(false)} navigate={(screen, params) => navigationRef.isReady() && navigationRef.navigate(screen, params)} />
    </Ctx.Provider>
  )
}
export const useAskAI = () => useContext(Ctx)
