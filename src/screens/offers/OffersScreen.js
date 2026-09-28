import { Alert, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryClient'
import { errorMessage } from '../../lib/api'
import { OFFER_TONE, listOffers, updateOfferStatus } from '../../services/offersService'
import { formatDate, formatRupees } from '../../lib/format'
import { Badge, Button, Card, Empty, ErrorState, Loading, Screen, Text } from '../../components/ui'

export default function OffersScreen() {
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({ queryKey: queryKeys.offers, queryFn: listOffers })
  const update = useMutation({
    mutationFn: ({ id, status }) => updateOfferStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.offers }),
    onError: (err) => Alert.alert('Couldn’t update offer', errorMessage(err)),
  })

  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={refetch} />

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <Text variant="caption">To send an offer, open a candidate and tap “Send offer”.</Text>
      {data.length ? (
        data.map((o) => (
          <Card key={o.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text variant="heading" style={{ flex: 1 }}>{o.candidateName}</Text>
              <Badge label={o.status} tone={OFFER_TONE[o.status] ?? 'gray'} />
            </View>
            <Text variant="caption">{o.role} · {formatRupees(o.ctc)} / yr</Text>
            <Text variant="caption">Joining {formatDate(o.joiningDate)} · expires {formatDate(o.expiresOn)}</Text>
            {o.status === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Mark accepted" variant="secondary" style={{ flex: 1 }} onPress={() => update.mutate({ id: o.id, status: 'accepted' })} />
                <Button title="Mark rejected" variant="danger" style={{ flex: 1 }} onPress={() => update.mutate({ id: o.id, status: 'rejected' })} />
              </View>
            ) : null}
          </Card>
        ))
      ) : (
        <Empty icon="file-text" title="No offers yet" />
      )}
    </Screen>
  )
}
