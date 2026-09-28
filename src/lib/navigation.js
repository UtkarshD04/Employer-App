import { createNavigationContainerRef } from '@react-navigation/native'

// Lets code outside any screen (e.g. tapping a push notification) navigate.
export const navigationRef = createNavigationContainerRef()
