import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Btn, C, Field, Input, Sheet, T } from '../wk'
import { apiMessage, submitScorecard } from '../../services/recruiter'

export const CRITERIA = [
  ['communication', 'Communication'],
  ['technical', 'Technical / functional skills'],
  ['roleFit', 'Role fit'],
  ['problemSolving', 'Problem-solving'],
  ['cultureFit', 'Culture / team fit'],
]
const RECOMMENDATIONS = ['Strong Yes', 'Yes', 'Maybe', 'No']

// One interviewer's structured feedback. Resubmitting replaces your own earlier scorecard.
export default function ScorecardSheet({ interview, myId, onClose, onSaved, toast }) {
  const [ratings, setRatings] = useState({})
  const [rec, setRec] = useState('')
  const [comments, setComments] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!interview) return
    const mine = interview.scorecards.find((s) => s.interviewer === myId)
    setRatings(mine?.ratings ?? {})
    setRec(mine?.recommendation ?? '')
    setComments(mine?.comments ?? '')
    setErrors({})
  }, [interview, myId])

  const submit = async () => {
    const e = {}
    CRITERIA.forEach(([k]) => !ratings[k] && (e[k] = 'Rate from 1 to 5.'))
    if (!rec) e.recommendation = 'Choose an overall recommendation.'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      await submitScorecard(interview.id, { ratings, recommendation: rec, comments })
      toast('Scorecard submitted')
      onSaved()
      onClose()
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { form: apiMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={!!interview}
      onClose={busy ? () => {} : onClose}
      title="Interview scorecard"
      subtitle={interview ? `${interview.candidateName} · ${[interview.role, interview.round].filter(Boolean).join(' · ')}` : undefined}
      footer={<><Btn onPress={onClose} disabled={busy}>Cancel</Btn><Btn variant="primary" onPress={submit} loading={busy}>Submit scorecard</Btn></>}
    >
      <View style={{ gap: 16 }}>
        <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12 }}>
          {CRITERIA.map(([k, label], i) => (
            <View key={k} style={{ gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
              <T s={13.5} w="s">{label}</T>
              <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="radiogroup">
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = ratings[k] === n
                  return (
                    <Pressable key={n} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setRatings((r) => ({ ...r, [k]: n }))} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? C.accent : '#fff' }}>
                      <T s={14} w="b" c={on ? '#fff' : C.ink2}>{n}</T>
                    </Pressable>
                  )
                })}
              </View>
              {errors[k] ? <T s={12} w="m" c={C.bad}>{errors[k]}</T> : null}
            </View>
          ))}
        </View>
        <T s={11.5} c={C.muted} style={{ marginTop: -8 }}>1 = Poor · 3 = Good · 5 = Excellent</T>

        <View style={{ gap: 6 }}>
          <T s={12.5} w="s" c={C.ink2}>Overall recommendation</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RECOMMENDATIONS.map((r) => {
              const on = rec === r
              return (
                <Pressable key={r} accessibilityState={{ selected: on }} onPress={() => setRec(r)} style={{ minHeight: 40, minWidth: '22%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? C.accentSoft : '#fff' }}>
                  <T s={13} w="b" c={on ? C.accent : C.ink}>{r}</T>
                </Pressable>
              )
            })}
          </View>
          {errors.recommendation ? <T s={12} w="m" c={C.bad}>{errors.recommendation}</T> : null}
        </View>

        <Field label="Comments (private to your team)" error={errors.comments}>
          <Input value={comments} onChangeText={setComments} multiline maxLength={2000} />
        </Field>
        {errors.form ? <T s={13} w="m" c={C.bad}>{errors.form}</T> : null}
      </View>
    </Sheet>
  )
}
