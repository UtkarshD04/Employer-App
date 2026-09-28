import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { useTheme } from '../../theme'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/api'
import { Button, FadeIn, Text, TextField } from '../../components/ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginScreen({ navigation }) {
  const { colors, spacing, isDark } = useTheme()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid work email.')
    if (!password) return setError('Enter your password.')
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(errorMessage(err, 'Couldn’t sign in. Please try again.'))
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <FadeIn style={{ alignItems: 'center', gap: 6, marginBottom: spacing.md }}>
          <Image source={isDark ? require('../../../assets/logo-dark.png') : require('../../../assets/logo.png')} style={{ height: 64, width: 64 * (5000 / 2725), marginVertical: -12 }} resizeMode="contain" />
          <Text variant="title">Employer sign in</Text>
          <Text variant="body" color="inkSecondary" style={{ textAlign: 'center' }}>Manage jobs, candidates and interviews on the go.</Text>
        </FadeIn>
        <TextField label="Work email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@company.com" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Your password" onSubmitEditing={submit} />
        {error ? <Text variant="caption" color="red">{error}</Text> : null}
        <Button title="Sign in" onPress={submit} loading={loading} />
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={10} style={{ alignSelf: 'center' }}>
          <Text variant="label" color="navy">Forgot password?</Text>
        </Pressable>
        <Text variant="caption" style={{ textAlign: 'center', marginTop: spacing.md }}>
          New to Mzobs? Create your company account at mzobs.com/employers.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
