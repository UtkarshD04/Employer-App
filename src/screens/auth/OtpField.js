import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Text, TextField } from '../../components/ui'

const RESEND_SECONDS = 30

// 6-digit code input with a resend countdown. `resetKey` restarts the timer (after each send).
export default function OtpField({ phone, destination, value, onChange, onSubmit, onResend, resetKey, error }) {
  const [left, setLeft] = useState(RESEND_SECONDS)

  useEffect(() => {
    setLeft(RESEND_SECONDS)
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resetKey])

  return (
    <View style={{ gap: 10 }}>
      <TextField
        label={`Enter the 6-digit code sent to ${destination ?? `+91 ${phone}`}`}
        value={value}
        onChangeText={(v) => {
          const code = v.replace(/\D/g, '').slice(0, 6)
          onChange(code)
          // Verify as soon as the sixth digit lands (typed, pasted or SMS autofill).
          if (code.length === 6 && value.length < 6) onSubmit(code)
        }}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
        placeholder="••••••"
        autoFocus
        onSubmitEditing={() => onSubmit(value)}
        error={error}
        inputStyle={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
      />
      <Pressable onPress={onResend} disabled={left > 0} hitSlop={10} style={{ alignSelf: 'flex-end' }}>
        <Text variant="label" color={left > 0 ? 'inkTertiary' : 'navy'}>{left > 0 ? `Resend OTP in 0:${String(left).padStart(2, '0')}` : 'Resend OTP'}</Text>
      </Pressable>
    </View>
  )
}
