import { ActivityIndicator, View } from 'react-native'
import { DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme'
import { navigationRef } from '../lib/navigation'
import { AskAIProvider } from '../store/askai'
import { ToastStack } from '../components/web/Shell'
import LandingScreen from '../screens/auth/LandingScreen'
import LoginScreen from '../screens/auth/LoginScreen'
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'
// The recruiter website's screens, one for one.
import SearchScreen from '../screens/web/SearchScreen'
import CandidateProfileScreen from '../screens/web/CandidateProfileScreen'
import { JobFormScreen, JobsScreen } from '../screens/web/Jobs'
import { JobTalentScreen, SavedSearchesScreen, ShortlistsScreen, UnlockedCvsScreen } from '../screens/web/Collections'
import { AITalentScreen, InterviewsScreen, MessagesScreen, ReportsScreen } from '../screens/web/Workspaces'
import { HelpScreen, NotificationsScreen, SettingsScreen } from '../screens/web/Account'
import PlanCreditsScreen from '../screens/web/PlanCredits'
// Employer-account screens that aren't part of the recruiter website but stay in the app.
import OffersScreen from '../screens/offers/OffersScreen'
import CreateOfferScreen from '../screens/offers/CreateOfferScreen'
import TeamScreen from '../screens/TeamScreen'
import CompanyScreen from '../screens/CompanyScreen'

const Stack = createNativeStackNavigator()

export default function RootNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const { colors, fontFamily } = useTheme()

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
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {isAuthenticated ? (
        <AskAIProvider>
          <Stack.Navigator screenOptions={screenOptions} initialRouteName="Search">
            {web.map(([name, component]) => <Stack.Screen key={name} name={name} component={component} options={bare} />)}
            <Stack.Screen name="Offers" component={OffersScreen} />
            <Stack.Screen name="CreateOffer" component={CreateOfferScreen} options={{ title: 'Send offer' }} />
            <Stack.Screen name="Team" component={TeamScreen} />
            <Stack.Screen name="Company" component={CompanyScreen} options={{ title: 'Company profile' }} />
          </Stack.Navigator>
          <ToastStack />
        </AskAIProvider>
      ) : (
        <Stack.Navigator screenOptions={screenOptions} initialRouteName="Landing">
          <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset password' }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  )
}
