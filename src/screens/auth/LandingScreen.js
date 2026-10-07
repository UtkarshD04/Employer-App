import { Image, ScrollView, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { Button, FadeIn, Text } from '../../components/ui'

const FEATURES = [
  { icon: 'briefcase', title: 'Post jobs', desc: 'Publish roles with skills, location, experience and salary requirements.' },
  { icon: 'search', title: 'Find candidates', desc: 'Discover talent that matches the requirements that matter to you.' },
  { icon: 'sliders', title: 'Search & filter', desc: 'Narrow down relevant talent by skills, experience and location.' },
  { icon: 'inbox', title: 'Manage applications', desc: 'Review and organise applications as they come in, from one inbox.' },
  { icon: 'check-square', title: 'Shortlist talent', desc: 'Review candidate profiles and move the relevant ones forward.' },
  { icon: 'calendar', title: 'Schedule interviews', desc: 'Manage interview steps with the candidates you shortlist.' },
]

export default function LandingScreen({ navigation }) {
  const { colors, spacing, radius, isDark } = useTheme()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xl, gap: spacing.xl }} showsVerticalScrollIndicator={false}>
        <FadeIn style={{ alignItems: 'center', gap: 14 }}>
          <Image source={isDark ? require('../../../assets/logo-dark.png') : require('../../../assets/logo.png')} style={{ height: 56, width: 56 * (5000 / 2725) }} resizeMode="contain" />
          <View style={{ backgroundColor: colors.navyTint, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text variant="label" color="navy" style={{ letterSpacing: 0.6, textTransform: 'uppercase', fontSize: 11 }}>Mzobs for employers</Text>
          </View>
          <Text variant="display" style={{ textAlign: 'center', fontSize: 30, lineHeight: 36 }}>
            Build your team with the right talent.
          </Text>
          <Text variant="body" color="inkSecondary" style={{ textAlign: 'center', maxWidth: 320 }}>
            Post jobs, discover relevant talent, and manage your hiring journey — all in one place.
          </Text>
        </FadeIn>

        <FadeIn delay={80} style={{ gap: spacing.sm }}>
          <Button title="Login" onPress={() => navigation.navigate('Login')} />
          <Button title="Register" variant="secondary" onPress={() => navigation.navigate('Register')} />
        </FadeIn>

        <FadeIn delay={140} style={{ gap: spacing.md }}>
          <Text variant="section">Everything you need to hire</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {FEATURES.map((f) => (
              <View
                key={f.title}
                style={{
                  flexBasis: '47%',
                  flexGrow: 1,
                  gap: 8,
                  padding: 14,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={f.icon} size={16} color={colors.blue} />
                </View>
                <Text variant="heading">{f.title}</Text>
                <Text variant="caption">{f.desc}</Text>
              </View>
            ))}
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  )
}
