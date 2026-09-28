import { useState } from 'react'
import { useTheme } from '../../theme'
import { errorMessage } from '../../lib/api'
import { forgotPassword } from '../../services/authService'
import { Button, Screen, Text, TextField } from '../../components/ui'

export default function ForgotPasswordScreen({ navigation }) {
  const { spacing } = useTheme()
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ loading: false, sent: false, error: '' })

  async function submit() {
    if (!email.trim()) return setState((s) => ({ ...s, error: 'Enter your work email.' }))
    setState({ loading: true, sent: false, error: '' })
    try {
      await forgotPassword(email)
      setState({ loading: false, sent: true, error: '' })
    } catch (err) {
      setState({ loading: false, sent: false, error: errorMessage(err) })
    }
  }

  return (
    <Screen contentStyle={{ gap: spacing.lg }}>
      <Text variant="caption">Enter your work email and we’ll send a link to reset your password. The link opens in your browser.</Text>
      <TextField label="Work email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@company.com" />
      {state.error ? <Text variant="caption" color="red">{state.error}</Text> : null}
      {state.sent ? <Text variant="caption" color="green">If that email has an account, a reset link is on its way.</Text> : null}
      <Button title="Send reset link" onPress={submit} loading={state.loading} />
      <Button title="Back to sign in" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  )
}
