import { useState } from 'react'
import { Alert, Platform, Pressable } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryClient'
import { errorMessage } from '../../lib/api'
import { createOffer } from '../../services/offersService'
import { listJobs } from '../../services/jobsService'
import { lpaToRupees, toIsoDate } from '../../lib/format'
import { useTheme } from '../../theme'
import { Button, ChipRow, Screen, Text, TextField } from '../../components/ui'

const inDays = (n) => new Date(Date.now() + n * 24 * 3600 * 1000)

export default function CreateOfferScreen({ route, navigation }) {
  const { candidate } = route.params
  const { colors, radius } = useTheme()
  const qc = useQueryClient()
  const jobs = useQuery({ queryKey: queryKeys.jobs, queryFn: listJobs })
  const [role, setRole] = useState(candidate.role ?? '')
  const [jobId, setJobId] = useState(candidate.jobId ?? '')
  const [ctc, setCtc] = useState('')
  const [joining, setJoining] = useState(inDays(30))
  const [expires, setExpires] = useState(inDays(7))
  const [picker, setPicker] = useState(null) // 'joining' | 'expires'

  const save = useMutation({
    mutationFn: () => createOffer({ candidateId: candidate.id, role: role.trim(), jobId, ctc: lpaToRupees(ctc), joiningDate: toIsoDate(joining), expiresOn: toIsoDate(expires) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.offers })
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      navigation.replace('Offers')
    },
    onError: (err) => Alert.alert('Couldn’t send offer', errorMessage(err)),
  })

  const box = { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, padding: 14 }
  const jobOptions = (jobs.data ?? []).map((j) => ({ id: j.id, label: j.title }))

  return (
    <Screen>
      <Text variant="heading">{candidate.name}</Text>
      <TextField label="Role" value={role} onChangeText={setRole} />
      <Text variant="label">Job</Text>
      <ChipRow options={jobOptions} value={jobId} onChange={setJobId} />
      <TextField label="CTC offered (LPA)" value={ctc} onChangeText={setCtc} keyboardType="numeric" placeholder="e.g. 8" />
      <Text variant="label">Joining date</Text>
      <Pressable style={box} onPress={() => setPicker('joining')}><Text>{toIsoDate(joining)}</Text></Pressable>
      <Text variant="label">Offer valid until</Text>
      <Pressable style={box} onPress={() => setPicker('expires')}><Text>{toIsoDate(expires)}</Text></Pressable>
      {picker ? (
        <DateTimePicker
          value={picker === 'joining' ? joining : expires}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, d) => {
            setPicker(Platform.OS === 'ios' ? picker : null)
            if (d) (picker === 'joining' ? setJoining : setExpires)(d)
          }}
        />
      ) : null}
      <Button title="Send offer" loading={save.isPending} disabled={!role.trim() || !jobId || !(Number(ctc) > 0)} onPress={() => save.mutate()} />
    </Screen>
  )
}
