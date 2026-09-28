import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_600SemiBold_Italic, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter'
import { QueryClientProvider } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { queryClient } from './src/lib/queryClient'
import { AuthProvider } from './src/context/AuthContext'
import { ThemeProvider } from './src/theme'
import { WorkspaceProvider } from './src/store/workspace'
import { navigationRef } from './src/lib/navigation'
import RootNavigator from './src/navigation/RootNavigator'

// Show notifications while the app is open, not just when backgrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
})

// A tapped push opens the notifications list (the backend sends { category } only).
function useNotificationTap() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) navigationRef.navigate('Notifications')
    })
    return () => sub.remove()
  }, [])
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_600SemiBold_Italic, Inter_700Bold, Inter_800ExtraBold })
  useNotificationTap()

  if (!fontsLoaded)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <WorkspaceProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </WorkspaceProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
