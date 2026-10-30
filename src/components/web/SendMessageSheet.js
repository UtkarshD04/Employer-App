import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Btn, Banner, C, Field, Input, Select, Sheet, T } from '../wk'
import { apiMessage, listTemplates, previewMessage, sendMessage } from '../../services/recruiter'

// Sends one of the company's message templates to one candidate. Email goes through the compliant outreach path (the
// candidate's email must be unlocked); in-app goes to the candidate's MZOBS inbox. No bulk SMS/WhatsApp here by design.
export default function SendMessageSheet({ candidate, onClose, onSent, toast, defaultKey = 'shortlist_update' }) {
  const [templates, setTemplates] = useState([])
  const [key, setKey] = useState(defaultKey)
  const [channel, setChannel] = useState('in_app')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [vars, setVars] = useState({})
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const candidateId = candidate?.id

  useEffect(() => {
    if (!candidateId) return
    listTemplates().then((r) => setTemplates(r.templates)).catch(() => setTemplates([]))
    setKey(defaultKey)
    setVars({})
    setError('')
  }, [candidateId, defaultKey])

  // Refresh the rendered preview whenever the template or the filled-in values change (short debounce while typing).
  useEffect(() => {
    if (!candidateId || !templates.length) return
    const t = setTimeout(() => {
      previewMessage({ candidateId, templateKey: key, variables: vars })
        .then((p) => {
          setPreview(p)
          setSubject(p.subject)
          setBody(p.body)
          setChannel((ch) => (p.channels[ch]?.available ? ch : p.channels.in_app.available ? 'in_app' : p.channels.email.available ? 'email' : ch))
        })
        .catch((e) => setError(apiMessage(e)))
    }, 250)
    return () => clearTimeout(t)
  }, [candidateId, key, vars, templates.length])

  const missing = preview?.missing ?? []
  const ch = preview?.channels?.[channel]
  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await sendMessage({ candidateId, templateKey: key, channel, subject, body, variables: vars })
      toast(`Message sent to ${candidate.name}`)
      onSent?.()
      onClose()
    } catch (e) {
      setError(apiMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open={!!candidate}
      onClose={busy ? () => {} : onClose}
      title="Send a message"
      subtitle={candidate?.name}
      footer={<><Btn onPress={onClose} disabled={busy}>Cancel</Btn><Btn variant="primary" onPress={send} loading={busy} disabled={!preview || missing.length > 0 || ch?.available === false}>Send message</Btn></>}
    >
      <View style={{ gap: 16 }}>
        <Field label="Template"><Select value={key} onChange={setKey} options={templates.map((t) => [t.key, t.label])} title="Template" /></Field>
        <Field label="Send by">
          <Select
            value={channel}
            onChange={setChannel}
            title="Send by"
            options={[
              ['in_app', `MZOBS inbox${preview?.channels.in_app.available === false ? ' (unavailable)' : ''}`],
              ['email', `Email${preview?.channels.email.available === false ? ' (email not unlocked)' : ''}`],
            ]}
          />
        </Field>
        {ch?.available === false ? <Banner tone="warn">{ch.reason}</Banner> : null}
        {missing.length > 0 ? (
          <View style={{ gap: 10 }}>
            <T s={12.5} w="s" c={C.ink2}>Fill in the missing details before sending</T>
            {missing.map((m) => <Field key={m} label={m.replace(/_/g, ' ')}><Input value={vars[m] ?? ''} onChangeText={(v) => setVars((x) => ({ ...x, [m]: v }))} /></Field>)}
          </View>
        ) : null}
        <Field label="Subject"><Input value={subject} editable={false} style={{ backgroundColor: C.sunken }} /></Field>
        <Field label="Message" hint="Edit the wording of a template under Messages → Templates."><Input value={body} editable={false} multiline style={{ backgroundColor: C.sunken, minHeight: 180 }} /></Field>
        {error ? <T s={13} w="m" c={C.bad}>{error}</T> : null}
      </View>
    </Sheet>
  )
}
