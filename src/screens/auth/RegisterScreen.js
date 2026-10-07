import { useState } from 'react'
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/api'
import * as authService from '../../services/authService'
import { Button, ChipRow, FadeIn, Stepper, Text, TextField } from '../../components/ui'
import OtpField from './OtpField'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[6-9]\d{9}$/
const COMPANY_SIZES = ['1–50 employees', '51–200 employees', '201–500 employees', '501–1000 employees', '1000+ employees']
const TITLES = ['Verify mobile', 'Your details', 'Company details']

// Naukri-recruiter-style registration: mobile + OTP first (a number that already has an account
// just signs in), then personal details, then company details.
export default function RegisterScreen({ navigation, route }) {
  const preset = route?.params?.phoneToken ? route.params : null
  const { colors, spacing, isDark } = useTheme()
  const { startSession } = useAuth()
  const [step, setStep] = useState(preset ? 1 : 0)
  const [phone, setPhone] = useState(preset?.phone ?? '')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(0)
  const [phoneToken, setPhoneToken] = useState(preset?.phoneToken ?? null)
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '', industry: '', size: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const fail = (msg) => { setError(msg); return false }

  async function sendOtp() {
    if (!PHONE_RE.test(phone)) return fail('Enter a valid 10-digit mobile number.')
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

  async function verifyOtp() {
    if (otp.length !== 6) return fail('Enter the 6-digit code.')
    setError('')
    setLoading(true)
    try {
      const token = await authService.verifyOtp(phone, otp)
      try {
        // The number already has an account → sign straight in.
        startSession(await authService.phoneLogin(phone, token))
        return
      } catch (err) {
        if (err?.response?.status !== 404) throw err
      }
      setPhoneToken(token)
      setStep(1)
    } catch (err) {
      setError(errorMessage(err, 'Couldn’t verify the OTP. Please try again.'))
    }
    setLoading(false)
  }

  function nextFromDetails() {
    if (!form.name.trim()) return fail('Enter your full name.')
    if (!EMAIL_RE.test(form.email.trim())) return fail('Enter a valid work email.')
    if (form.password.length < 8) return fail('Password must be at least 8 characters.')
    setError('')
    setStep(2)
  }

  async function createAccount() {
    if (!form.companyName.trim()) return fail('Enter your company name.')
    if (!form.industry.trim()) return fail('Enter your industry.')
    if (!form.size) return fail('Select a company size.')
    setError('')
    setLoading(true)
    try {
      startSession(await authService.signup({ ...form, email: form.email.trim(), phone, phoneToken }))
    } catch (err) {
      setError(errorMessage(err, 'Couldn’t create your account. Please try again.'))
      setLoading(false)
    }
  }

  function back() {
    setError('')
    if (step === 0) return navigation.goBack()
    setStep(step - 1)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable onPress={back} hitSlop={12} style={{ marginTop: spacing.xl, marginLeft: spacing.xl, alignSelf: 'flex-start' }}>
        <Feather name="arrow-left" size={20} color={colors.ink} />
      </Pressable>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <FadeIn style={{ alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
          <Image source={isDark ? require('../../../assets/logo-dark.png') : require('../../../assets/logo.png')} style={{ height: 56, width: 56 * (5000 / 2725), marginVertical: -10 }} resizeMode="contain" />
          <Text variant="title">Register as employer</Text>
          <Text variant="body" color="inkSecondary" style={{ textAlign: 'center' }}>{TITLES[step]}</Text>
        </FadeIn>

        <Stepper count={3} current={step} />

        {step === 0 ? (
          <>
            <TextField
              label="Mobile number"
              value={phone}
              onChangeText={(v) => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setOtpSent(0); setOtp('') }}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="98765 43210"
              editable={!otpSent}
            />
            {otpSent ? (
              <>
                <OtpField phone={phone} value={otp} onChange={setOtp} onSubmit={verifyOtp} onResend={sendOtp} resetKey={otpSent} />
                {error ? <Text variant="caption" color="red">{error}</Text> : null}
                <Button title="Verify & continue" onPress={verifyOtp} loading={loading} />
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
        ) : null}

        {step === 1 ? (
          <>
            <TextField label="Full name" value={form.name} onChangeText={set('name')} autoComplete="name" placeholder="Rhea Kapoor" />
            <TextField label="Work email" value={form.email} onChangeText={set('email')} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@company.com" />
            <View>
              <TextField label="Create password" value={form.password} onChangeText={set('password')} secureTextEntry={!showPassword} autoComplete="new-password" placeholder="At least 8 characters" />
              <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <Text variant="label" color="navy">{showPassword ? 'Hide password' : 'Show password'}</Text>
              </Pressable>
            </View>
            {error ? <Text variant="caption" color="red">{error}</Text> : null}
            <Button title="Continue" onPress={nextFromDetails} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <TextField label="Company name" value={form.companyName} onChangeText={set('companyName')} placeholder="Company name" />
            <TextField label="Industry" value={form.industry} onChangeText={set('industry')} placeholder="e.g. IT Services" />
            <View style={{ gap: 6 }}>
              <Text variant="label">Company size</Text>
              <ChipRow options={COMPANY_SIZES.map((s) => ({ id: s, label: s }))} value={form.size} onChange={set('size')} scroll={false} />
            </View>
            {error ? <Text variant="caption" color="red">{error}</Text> : null}
            <Button title="Create account" onPress={createAccount} loading={loading} />
            <Text variant="caption" style={{ textAlign: 'center' }}>
              By creating an account you agree to the{' '}
              <Text variant="caption" color="navy" onPress={() => Linking.openURL('https://mzobs.com/terms-of-service')}>Terms</Text>
              {' '}and{' '}
              <Text variant="caption" color="navy" onPress={() => Linking.openURL('https://mzobs.com/privacy-policy')}>Privacy Policy</Text>.
            </Text>
          </>
        ) : null}

        {step === 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md }}>
            <Text variant="caption">Already registered?</Text>
            <Pressable onPress={() => navigation.replace('Login')} hitSlop={10}>
              <Text variant="caption" color="navy" style={{ fontWeight: '600' }}>Login</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
