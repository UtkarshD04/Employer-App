import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { parseNaturalLanguage } from '../../lib/talent/parse'
import { criteriaToChips } from '../../lib/talent/criteria'
import { useWorkspace } from '../../store/workspace'
import { Btn, C, Chip, Input, Sheet, T } from '../wk'

// `ready` prompts run against the real parser today; the rest are listed honestly as needing
// the AI service instead of faking an answer.
export const AI_PROMPTS = [
  { id: 'jd', label: 'Find candidates matching this JD', hint: 'Paste a job description; Mzobs extracts skills, experience and location and searches.', ready: true },
  { id: 'nl', label: 'Describe who you need', hint: 'Plain-English search — “React developers in Pune, 3–5 years”.', ready: true },
  { id: 'explain', label: 'Explain why this candidate is relevant', hint: 'Open any AI match badge for the rule-based breakdown.', ready: false },
  { id: 'similar', label: 'Find similar candidates', hint: 'Available on every candidate profile.', ready: false },
  { id: 'outreach', label: 'Draft outreach message', hint: 'Template drafts are available in Contact; model-written drafts need the AI service.', ready: false },
  { id: 'summarise', label: 'Summarise candidate', hint: 'Needs the Mzobs AI service.', ready: false },
  { id: 'questions', label: 'Generate interview questions', hint: 'Needs the Mzobs AI service.', ready: false },
  { id: 'gaps', label: 'Identify skill gaps', hint: 'Shown as “Missing or weaker areas” in the match explanation.', ready: false },
]

export default function AskAI({ open, onClose, navigate }) {
  const { toast } = useWorkspace()
  const [text, setText] = useState('')
  useEffect(() => { if (open) setText('') }, [open])
  const parsed = text.trim() ? parseNaturalLanguage(text) : null
  const chips = parsed ? criteriaToChips(parsed) : []

  const go = () => {
    if (!parsed || !chips.length) return toast('Mzobs couldn’t find skills, roles or locations in that. Add a few details.', { tone: 'warn' })
    onClose()
    navigate('Search', { criteria: parsed, nonce: Date.now() })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Ask Mzobs AI" subtitle="Describe who you need, or paste a job description." footer={<><Btn onPress={onClose}>Cancel</Btn><Btn variant="ai" icon={Sparkles} disabled={!text.trim()} onPress={go}>Find candidates</Btn></>}>
      <Input value={text} onChangeText={setText} multiline autoFocus style={{ minHeight: 130 }} placeholder="e.g. Senior Python developer, 4–8 years, FastAPI and AWS, Bengaluru, joins within 45 days…" />
      <View style={{ minHeight: 28, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
        {chips.length > 0 ? <T s={12} w="m" c={C.accentText}>Understood:</T> : null}
        {chips.map((c) => <Chip key={c.key} tone="ai">{c.label}</Chip>)}
      </View>
      <T s={12} w="s" c={C.muted} style={{ marginTop: 16, marginBottom: 8, letterSpacing: 0.6 }}>WHAT MZOBS AI CAN DO</T>
      <View style={{ gap: 6 }}>
        {AI_PROMPTS.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 8, backgroundColor: C.line2, paddingHorizontal: 12, paddingVertical: 9 }}>
            <T s={12.5} style={{ flex: 1 }}>{p.label}</T>
            {!p.ready ? <T s={10.5} w="m" c={C.muted}>SOON</T> : null}
          </View>
        ))}
      </View>
    </Sheet>
  )
}
