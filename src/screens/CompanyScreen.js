import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import { errorMessage } from '../lib/api'
import { getCompany, updateCompany } from '../services/companyService'
import { Button, ErrorState, Loading, Screen, TextField } from '../components/ui'

const FIELDS = [
  ['name', 'Company name'],
  ['industry', 'Industry'],
  ['size', 'Company size'],
  ['founded', 'Founded'],
  ['website', 'Website'],
  ['linkedin', 'LinkedIn'],
  ['hq', 'Headquarters'],
]

export default function CompanyScreen() {
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.company, queryFn: getCompany })
  const [form, setForm] = useState({})

  useEffect(() => {
    if (data) setForm(Object.fromEntries([...FIELDS.map(([k]) => k), 'about'].map((k) => [k, data[k] == null ? '' : String(data[k])])))
  }, [data])

  const save = useMutation({
    mutationFn: () => updateCompany(form),
    onSuccess: (company) => {
      qc.setQueryData(queryKeys.company, company)
      Alert.alert('Saved', 'Company profile updated.')
    },
    onError: (err) => Alert.alert('Couldn’t save', errorMessage(err)),
  })

  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={refetch} />

  return (
    <Screen>
      {FIELDS.map(([k, label]) => (
        <TextField key={k} label={label} value={form[k] ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, [k]: v }))} autoCapitalize={['website', 'linkedin'].includes(k) ? 'none' : 'sentences'} />
      ))}
      <TextField label="About" value={form.about ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, about: v }))} multiline />
      <Button title="Save changes" loading={save.isPending} onPress={() => save.mutate()} />
    </Screen>
  )
}
