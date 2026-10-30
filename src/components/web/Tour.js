import { useEffect, useState } from 'react'
import { View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CalendarDays, LayoutDashboard, Search, Users } from 'lucide-react-native'
import { Btn, C, Sheet, T } from '../wk'

const KEY = 'mzobs-tour-seen'
const STEPS = [
  { icon: Search, title: 'Find talent', body: 'Search candidates in plain words — “React developers in Pune” — then narrow with filters. Saved searches tell you who is new.' },
  { icon: Users, title: 'Work your pipeline', body: 'Applicants shows everyone by stage. Swipe a card right to shortlist, left to reject, or select several to move, assign or compare them.' },
  { icon: CalendarDays, title: 'Interview with a scorecard', body: 'Schedule from any profile, pick the interviewers, and each one scores the candidate. Add it to your calendar in one tap.' },
  { icon: LayoutDashboard, title: 'Start from Overview', body: 'Overview lists what needs you today — new applicants, feedback owed, offers waiting — so nothing slips.' },
]

/** A four-step welcome shown once per device, after sign-in. */
export default function Tour() {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => !v && setOpen(true)).catch(() => {})
  }, [])
  const done = () => {
    setOpen(false)
    AsyncStorage.setItem(KEY, '1').catch(() => {})
  }
  const step = STEPS[i]
  const last = i === STEPS.length - 1
  return (
    <Sheet
      open={open}
      onClose={done}
      title="Welcome to Mzobs"
      subtitle={`Step ${i + 1} of ${STEPS.length}`}
      footer={<><Btn variant="ghost" onPress={done}>Skip</Btn><Btn variant="primary" onPress={() => (last ? done() : setI(i + 1))}>{last ? 'Get started' : 'Next'}</Btn></>}
    >
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <step.icon size={26} color={C.accent} />
        </View>
        <T s={18} w="b" style={{ textAlign: 'center' }}>{step.title}</T>
        <T s={14} c={C.ink2} style={{ textAlign: 'center' }}>{step.body}</T>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          {STEPS.map((_, k) => <View key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: k === i ? C.accent : C.line }} />)}
        </View>
      </View>
    </Sheet>
  )
}
