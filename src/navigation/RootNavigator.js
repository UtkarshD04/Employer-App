import { ActivityIndicator, View } from 'react-native'
import { DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme'
import { navigationRef } from '../lib/navigation'
import { AskAIProvider } from '../store/askai'
import { ToastStack } from '../components/web/Shell'
import Tour from '../components/web/Tour'
import LandingScreen from '../screens/auth/LandingScreen'
import LoginScreen from '../screens/auth/LoginScreen'
import RegisterScreen from '../screens/auth/RegisterScreen'
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'
// The recruiter website's screens, one for one.
import SearchScreen from '../screens/web/SearchScreen'
import CandidateProfileScreen from '../screens/web/CandidateProfileScreen'
import { JobFormScreen, JobsScreen } from '../screens/web/Jobs'
import { JobTalentScreen, SavedSearchesScreen, ShortlistsScreen, UnlockedCvsScreen } from '../screens/web/Collections'
import { AITalentScreen, InterviewsScreen } from '../screens/web/Workspaces'
import MessagesScreen from '../screens/web/Messages'
import ReportsScreen from '../screens/web/Reports'
import OverviewScreen from '../screens/web/Overview'
import ApplicantsScreen from '../screens/web/Applicants'
import OffersScreen from '../screens/web/Offers'
import TeamScreen from '../screens/web/Team'
import FeedbackFollowUpsScreen from '../screens/web/FeedbackFollowUps'
import { HelpScreen, NotificationsScreen, SettingsScreen } from '../screens/web/Account'
import PlanCreditsScreen from '../screens/web/PlanCredits'
// Employer-account screens that aren't part of the recruiter website but stay in the app.
import CreateOfferScreen from '../screens/offers/CreateOfferScreen'
import CompanyScreen from '../screens/CompanyScreen'
import GstGateScreen from '../screens/GstGateScreen'
import { GST_REQUIRED } from '../lib/gstin'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import { getCompany } from '../services/companyService'

const Stack = createNativeStackNavigator()

// The navigator is remounted when the theme changes; handing it its last state back keeps the user on the same screen.
let lastNavState

export default function RootNavigator() {
  const { isAuthenticated, isBootstrapping, company: sessionCompany } = useAuth()
  const { colors, fontFamily } = useTheme()
  // Mandatory GST verification: a signed-in employer only gets the app once
  // their company's GSTIN is VERIFIED — the same record the website reads.
  // Seeded from the sign-in response so a verified account never flashes the gate.
  const companyQuery = useQuery({ queryKey: queryKeys.company, queryFn: getCompany, enabled: isAuthenticated, placeholderData: sessionCompany ?? undefined })
  // GST_REQUIRED mirrors the backend's GST_VERIFICATION_REQUIRED (off: no gate).
  const gstVerified = !GST_REQUIRED || companyQuery.data?.gstVerification?.status === 'VERIFIED'

  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, border: colors.border, text: colors.ink, primary: colors.navy },
  }
  const screenOptions = {
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.ink,
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: fontFamily.semibold, fontSize: 16 },
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: colors.bg },
  }
  const bare = { headerShown: false }
  const web = [
    ['Search', SearchScreen],
    ['Overview', OverviewScreen],
    ['Applicants', ApplicantsScreen],
    ['Offers', OffersScreen],
    ['Team', TeamScreen],
    ['FeedbackFollowUps', FeedbackFollowUpsScreen],
    ['CandidateProfile', CandidateProfileScreen],
    ['Jobs', JobsScreen],
    ['JobForm', JobFormScreen],
    ['JobTalent', JobTalentScreen],
    ['UnlockedCvs', UnlockedCvsScreen],
    ['SavedSearches', SavedSearchesScreen],
    ['Shortlists', ShortlistsScreen],
    ['Messages', MessagesScreen],
    ['Interviews', InterviewsScreen],
    ['AITalent', AITalentScreen],
    ['Reports', ReportsScreen],
    ['PlanCredits', PlanCreditsScreen],
    ['Settings', SettingsScreen],
    ['Notifications', NotificationsScreen],
    ['Help', HelpScreen],
  ]

  if (isBootstrapping)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    )

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} initialState={lastNavState} onStateChange={(st) => { lastNavState = st }}>
      {isAuthenticated && !gstVerified ? (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="GstGate" component={GstGateScreen} options={{ title: 'Verify your company' }} />
        </Stack.Navigator>
      ) : isAuthenticated ? (
        <AskAIProvider>
          <Stack.Navigator screenOptions={screenOptions} initialRouteName="Search">
            {web.map(([name, component]) => <Stack.Screen key={name} name={name} component={component} options={bare} />)}
            <Stack.Screen name="CreateOffer" component={CreateOfferScreen} options={{ title: 'Send offer' }} />
            <Stack.Screen name="Company" component={CompanyScreen} options={{ title: 'Company profile' }} />
          </Stack.Navigator>
          <ToastStack />
          <Tour />
        </AskAIProvider>
      ) : (
        <Stack.Navigator screenOptions={screenOptions} initialRouteName="Landing">
          <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset password' }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  )
}
