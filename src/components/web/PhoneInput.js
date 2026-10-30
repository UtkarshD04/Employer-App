import { useState } from 'react'
import { View } from 'react-native'
import { COUNTRIES, joinPhone, maxDigits, splitPhone } from '../../lib/phone'
import { Input, Select } from '../wk'

// Country-code picker + number box. `value` is the stored phone (see lib/phone.js):
// bare 10 digits for India, "+<code><number>" for anywhere else.
export default function PhoneInput({ value, onChange, placeholder = 'Mobile number', error, ...rest }) {
  const [picked, setPicked] = useState('91')
  const parsed = splitPhone(value)
  // A stored "+44…" decides the code; with nothing typed yet the picker's own choice stands.
  const cc = String(value ?? '').startsWith('+') ? parsed.cc : picked

  const pick = (code) => {
    setPicked(code)
    onChange(joinPhone(code, parsed.digits.slice(0, maxDigits(code))))
  }
  const type = (t) => onChange(joinPhone(cc, t.replace(/\D/g, '').slice(0, maxDigits(cc))))

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Select value={cc} onChange={pick} options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))} title="Country code" error={error} style={{ width: 112 }} />
      <Input
        value={parsed.digits}
        onChangeText={type}
        keyboardType="phone-pad"
        autoComplete="tel-national"
        textContentType="telephoneNumber"
        maxLength={maxDigits(cc)}
        placeholder={placeholder}
        error={error}
        accessibilityLabel="Phone number"
        style={{ flex: 1, minWidth: 0 }}
        {...rest}
      />
    </View>
  )
}
