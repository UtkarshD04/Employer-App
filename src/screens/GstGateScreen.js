import { View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import { getCompany } from '../services/companyService'
import { useAuth } from '../context/AuthContext'
import GstVerificationCard from '../components/GstVerificationCard'
import { Button, ErrorState, Loading, PageTitle, Screen, Text } from '../components/ui'

// The only screen a signed-in employer sees until the company's mandatory
// GST verification is VERIFIED (RootNavigator). The API refuses every other
// employer call meanwhile (Backend middleware/requireGstVerified.js), so this
// is the friendly face of that rule, not the protection itself.
export default function GstGateScreen() {
  const { logout } = useAuth()
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({ queryKey: queryKeys.company, queryFn: getCompany })

  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={refetch} />

  const underReview = data?.gstVerification?.status === 'UNDER_REVIEW'
  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <PageTitle
        lead="Verify your"
        accent="company"
        sub={
          underReview
            ? `${data?.name ?? 'Your company'} is waiting for a quick check by the Mzobs team. Pull down to refresh — the app unlocks as soon as it’s approved.`
            : 'Every employer on Mzobs is verified against the GST registry. Posting jobs, searching candidates and the rest of the app unlock once your GSTIN is verified.'
        }
      />
      <GstVerificationCard company={data} />
      <View style={{ gap: 8, marginTop: 8 }}>
        <Text variant="caption" style={{ textAlign: 'center' }}>Need help? hello@mzobs.com</Text>
        <Button title="Sign out" variant="secondary" onPress={logout} />
      </View>
    </Screen>
  )
}
