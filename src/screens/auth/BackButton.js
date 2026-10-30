import { Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme'
import { Text } from '../../components/ui'

// Back control for the header-less auth screens. Sits below the status bar / notch
// (a bare top margin put it under the Dynamic Island, where it couldn't be tapped).
export default function BackButton({ onPress }) {
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => ({
        marginTop: insets.top + spacing.sm, marginLeft: spacing.lg, alignSelf: 'flex-start',
        minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: spacing.sm, borderRadius: 999, opacity: pressed ? 0.6 : 1,
      })}
    >
      <Feather name="arrow-left" size={20} color={colors.ink} />
      <Text variant="label">Back</Text>
    </Pressable>
  )
}
