import { useCallback, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { MessageSquareWarning } from 'lucide-react-native'
import { PageScroll, PageTitle, Shell } from '../../components/web/Shell'
import RejectionFeedbackSheet, { feedbackSubmitError } from '../../components/web/RejectionFeedbackSheet'
import { Btn, C, Chip, EmptyState, Skeleton, T, card } from '../../components/wk'
import { FadeIn, useRefresh } from '../../components/web/rc'
import { useWorkspace } from '../../store/workspace'
import { getCandidateFeedback, listFeedbackFollowUps, resubmitFeedback } from '../../services/recruiter'
import { agoDate } from '../../lib/tfmt'

// Rejection feedback that a Mzobs reviewer sent back (needs more detail) or flagged (needs changes),
// so the employer can answer it without hunting for the candidate.
export default function FeedbackFollowUpsScreen() {
  const nav = useNavigation()
  const { toast } = useWorkspace()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState(null)
  const [opening, setOpening] = useState(null)

  const load = useCallback(() => {
    setError(false)
    return listFeedbackFollowUps().then(setRows).catch(() => setError(true))
  }, [])
  useEffect(() => { load() }, [load])

  const { refreshing, onRefresh } = useRefresh(load)

  // The form is pre-filled with what the employer sent last time, so they correct it rather than retype it.
  const startEditing = async (row) => {
    setOpening(row.id)
    try {
      const full = await getCandidateFeedback(row.candidateId)
      setEditing({ ...row, remarks: full?.history?.at(-1)?.remarks ?? '' })
    } catch {
      setEditing({ ...row, remarks: '' })
    } finally {
      setOpening(null)
    }
  }

  const submit = async (value) => {
    try {
      await resubmitFeedback(editing.id, value)
      setEditing(null)
      toast('Feedback updated and sent back for review')
      await load()
    } catch (e) {
      throw feedbackSubmitError(e)
    }
  }

  return (
    <Shell>
      <PageScroll onRefresh={onRefresh} refreshing={refreshing}>
        <PageTitle title="Feedback" accent="follow-ups" sub="Mzobs reviews the reasons you give when rejecting a candidate. When we need more detail, it shows up here." />
        <View style={{ gap: 12 }}>
          {rows === null && !error ? [0, 1].map((i) => <Skeleton key={i} h={96} r={16} />) : null}
          {error ? (
            <View style={[card, { padding: 20, gap: 8 }]}>
              <T s={13.5}>Couldn’t load your follow-ups.</T>
              <Pressable onPress={load} hitSlop={8} style={{ alignSelf: 'flex-start' }}><T s={13.5} w="s" c={C.accent}>Try again</T></Pressable>
            </View>
          ) : null}
          {rows?.length === 0 ? <EmptyState icon={MessageSquareWarning} title="Nothing needs your attention" body="You'll see a request here if Mzobs needs more detail on a rejection." /> : null}
          {rows?.map((row, k) => (
            <FadeIn key={row.id} index={k}><View style={[card, { padding: 16, gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => nav.navigate('CandidateProfile', { id: row.candidateId })}><T s={15} w="s">{row.candidateName || 'Candidate'}</T></Pressable>
                  <T s={12.5} c={C.muted}>{row.appliedFor} · {row.stageLabel} · updated {agoDate(row.updatedAt)}</T>
                </View>
                <Chip tone="accent">{row.status === 'flagged' ? 'Needs changes' : 'Needs more detail'}</Chip>
              </View>
              {row.clarification?.message ? (
                <View style={{ borderRadius: 8, backgroundColor: C.warnSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <T s={13} c={C.warn}><T s={13} w="s" c={C.warn}>Mzobs asked: </T>{row.clarification.message}</T>
                </View>
              ) : null}
              <Btn variant="primary" size="sm" loading={opening === row.id} onPress={() => startEditing(row)} style={{ alignSelf: 'flex-start' }}>Update feedback</Btn>
            </View></FadeIn>
          ))}
        </View>
      </PageScroll>
      <RejectionFeedbackSheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        candidateName={editing?.candidateName}
        initial={editing ? { stage: editing.stage, reasons: editing.reasons, remarks: editing.remarks } : undefined}
        clarification={editing?.clarification?.message}
        submitLabel="Resubmit feedback"
        onSubmit={submit}
      />
    </Shell>
  )
}
