import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/api'
import * as authService from '../../services/authService'
import { Button, FadeIn, Text, TextField } from '../../components/ui'
import OtpField from './OtpField'

const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginScreen({ navigation }) {
  const { colors, spacing, isDark } = useTheme()
  const { startSession, signIn } = useAuth()
  const [useEmail, setUseEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(0) // bumps on every send; 0 = not sent yet
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendOtp() {
    if (!PHONE_RE.test(phone)) return setError('Enter a valid 10-digit mobile number.')
    setError('')
    setLoading(true)
    try {
      await authService.sendOtp(phone)
      setOtp('')
      setOtpSent((n) => n + 1)
    } catch (err) {
      setError(errorMessage(err, 'Couldn’t send the OTP. Please try again.'))
    }
    setLoading(false)
  }

  async function emailLogin() {
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid work email.')
    if (!password) return setError('Enter your password.')
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err?.response?.status === 401 ? 'Invalid email or password. New to Mzobs? Tap Register below.' : errorMessage(err, 'Couldn’t sign in. Please try again.'))
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) return setError('Enter the 6-digit code.')
    setError('')
    setLoading(true)
    try {
      const phoneToken = await authService.verifyOtp(phone, otp)
      try {
        startSession(await authService.phoneLogin(phone, phoneToken))
        return
      } catch (err) {
        // No account for this number → carry on to sign-up with the number already verified.
        if (err?.response?.status === 404) {
          setLoading(false)
          navigation.replace('Register', { phone, phoneToken })
          return
        }
        throw err
      }
    } catch (err) {
      setError(errorMessage(err, 'Couldn’t sign in. Please try again.'))
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {navigation.canGoBack() ? (
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginTop: spacing.xl, marginLeft: spacing.xl }}>
          <Feather name="arrow-left" size={20} color={colors.ink} />
        </Pressable>
      ) : null}
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <FadeIn style={{ alignItems: 'center', gap: 6, marginBottom: spacing.md }}>
          <Image source={isDark ? require('../../../assets/logo-dark.png') : require('../../../assets/logo.png')} style={{ height: 64, width: 64 * (5000 / 2725), marginVertical: -12 }} resizeMode="contain" />
          <Text variant="title">Employer login</Text>
          <Text variant="body" color="inkSecondary" style={{ textAlign: 'center' }}>Manage jobs, candidates and interviews on the go.</Text>
        </FadeIn>

            {useEmail ? (
          <>
            <TextField label="Work email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@company.com" />
            <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Your password" onSubmitEditing={emailLogin} />
            {error ? <Text variant="caption" color="red">{error}</Text> : null}
            <Button title="Sign in" onPress={emailLogin} loading={loading} />
            <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={10} style={{ alignSelf: 'center' }}>
              <Text variant="label" color="navy">Forgot password?</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextField
              label="Mobile number"
              value={phone}
              onChangeText={(v) => {
                setPhone(v.replace(/\D/g, '').slice(0, 10))
                setOtpSent(0)
                setOtp('')
              }}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="98765 43210"
              editable={!otpSent}
            />
            {otpSent ? (
              <>
                <OtpField phone={phone} value={otp} onChange={setOtp} onSubmit={verifyOtp} onResend={sendOtp} resetKey={otpSent} />
                {error ? <Text variant="caption" color="red">{error}</Text> : null}
                <Button title="Verify & login" onPress={verifyOtp} loading={loading} />
                <Pressable onPress={() => { setOtpSent(0); setOtp(''); setError('') }} hitSlop={10} style={{ alignSelf: 'center' }}>
                  <Text variant="label" color="navy">Change number</Text>
                </Pressable>
              </>
            ) : (
              <>
                {error ? <Text variant="caption" color="red">{error}</Text> : null}
                <Button title="Get OTP" onPress={sendOtp} loading={loading} />
              </>
            )}
          </>
        )}

        <Pressable onPress={() => { setUseEmail((u) => !u); setError('') }} hitSlop={10} style={{ alignSelf: 'center' }}>
          <Text variant="label" color="navy">{useEmail ? 'Login with mobile OTP instead' : 'Login with email & password instead'}</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md }}>
          <Text variant="caption">New to Mzobs?</Text>
          <Pressable onPress={() => navigation.replace('Register')} hitSlop={10}>
            <Text variant="caption" color="navy" style={{ fontWeight: '600' }}>Register</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
