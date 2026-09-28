import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { AlertCircle, Braces, CheckCircle2, ChevronDown, CircleHelp, Search, Sparkles, X } from 'lucide-react-native'
import { SCOPES } from '../../lib/talent/criteria'
import { exampleQueries } from '../../lib/talent/parse'
import { BOOLEAN_EXAMPLES, FIELD_HELP, boolToString, validateBoolean } from '../../lib/talent/boolean'
import { Btn, C, F, Sheet, T, card, Press } from '../wk'
import { Check } from 'lucide-react-native'

function Toggle({ on, onPress, icon: Icon, tone, children }) {
  const ai = tone === 'ai'
  const fg = on ? (ai ? C.accentText : C.blueText) : C.muted
  return (
    <Press onPress={onPress} scale={0.96} accessibilityRole="switch" accessibilityState={{ checked: on }} style={{ minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, borderColor: on ? (ai ? '#a9dcd3' : '#bfdbfe') : C.line, backgroundColor: on ? (ai ? C.aiSoft : C.blueSoft) : '#fff' }}>
      <Icon size={13} color={fg} />
      <T s={12.5} w="m" c={fg}>{children}</T>
      <View style={{ width: 26, height: 15, borderRadius: 8, padding: 2, backgroundColor: on ? (ai ? C.ai : C.blue) : '#c4d1db', justifyContent: 'center' }}>
        <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#fff', transform: [{ translateX: on ? 11 : 0 }] }} />
      </View>
    </Press>
  )
}

export default function SearchComposer({ criteria, onSearch, onClear, canClear, loading }) {
  const [text, setText] = useState(criteria.q)
  const [mode, setMode] = useState(criteria.mode === 'boolean' ? 'boolean' : 'ai')
  const [scope, setScope] = useState(criteria.scope)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [focus, setFocus] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [tried, setTried] = useState(false)
  const [sel, setSel] = useState({ start: 0, end: 0 })
  const ref = useRef(null)

  // keep the box in sync when criteria are replaced from elsewhere (recent/saved search, job, AI panel)
  useEffect(() => {
    setText(criteria.q)
    if (criteria.mode === 'ai' || criteria.mode === 'boolean') setMode(criteria.mode)
  }, [criteria.q, criteria.mode])

  const ai = mode === 'ai'
  const isBool = mode === 'boolean'
  const check = useMemo(() => (isBool && text.trim() ? validateBoolean(text) : null), [isBool, text])

  const submit = (value = text) => {
    if (mode === 'boolean' && value.trim()) {
      if (!validateBoolean(value).ok) {
        setTried(true)
        return
      }
    }
    setTried(false)
    onSearch(value, mode, scope)
    ref.current?.blur()
  }

  // Inserts an operator/snippet at the caret (or wraps the selection for brackets and quotes).
  const insert = (snippet) => {
    const a = sel.start
    const b = sel.end
    const chosen = text.slice(a, b)
    let next
    let caret
    if (snippet === '()' || snippet === '""') {
      next = text.slice(0, a) + snippet[0] + chosen + snippet[1] + text.slice(b)
      caret = a + 1 + chosen.length
    } else {
      const pad = (text[a - 1] && !/\s|\(/.test(text[a - 1]) ? ' ' : '') + snippet + ' '
      next = text.slice(0, a) + pad + text.slice(b)
      caret = a + pad.length
    }
    setText(next)
    setSel({ start: caret, end: caret })
    ref.current?.focus()
  }
  const examples = exampleQueries()

  return (
    <View style={[card, { padding: 12, borderColor: focus ? (ai ? C.ai : C.blue) : C.line, borderWidth: focus ? 1.5 : 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 4, paddingTop: 4 }}>
        <View style={{ marginTop: 4, width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ai ? C.aiSoft : C.blueSoft }}>
          {ai ? <Sparkles size={16} color={C.ai} /> : <Braces size={16} color={C.blue} />}
        </View>
        <TextInput
          ref={ref}
          value={text}
          onChangeText={setText}
          onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onSubmitEditing={() => submit()}
          submitBehavior="blurAndSubmit"
          returnKeyType="search"
          multiline
          placeholder={ai ? 'Search skills, roles, companies, technologies or keywords…' : isBool ? 'python AND (aws OR gcp) NOT java' : 'Type keywords, separated by commas'}
          placeholderTextColor={C.ph}
          selectionColor={C.accent}
          accessibilityLabel="Search candidates"
          style={{ flex: 1, minHeight: 52, maxHeight: 120, fontFamily: isBool ? undefined : F.r, fontSize: isBool ? 14 : 15, lineHeight: 22, color: C.ink, paddingTop: 6, paddingBottom: 6, textAlignVertical: 'top' }}
        />
        {text || canClear ? (
          <Pressable onPress={() => { setText(''); setTried(false); onClear?.(); ref.current?.focus() }} accessibilityLabel="Clear search" hitSlop={6} style={{ marginTop: 2, width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={C.muted} />
          </Pressable>
        ) : null}
        <Press onPress={() => submit()} disabled={!!(check && !check.ok && tried)} accessibilityLabel="Search" style={{ marginTop: 1, height: 42, minWidth: 48, borderRadius: 16, backgroundColor: ai ? C.accent : C.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
          <Search size={16} color="#fff" />
        </Press>
      </View>

      <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: C.line2, paddingHorizontal: 4, paddingTop: 10 }}>
        <Toggle on={ai} tone="ai" icon={Sparkles} onPress={() => setMode(ai ? 'keyword' : 'ai')}>AI search</Toggle>
        <Toggle on={isBool} tone="blue" icon={Braces} onPress={() => setMode(isBool ? 'ai' : 'boolean')}>Boolean</Toggle>
        <Pressable onPress={() => setScopeOpen(true)} style={{ minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 10 }}>
          <T s={12.5} w="m" c={C.ink2}>Search in: <T s={12.5} w="s">{SCOPES.find((s) => s.id === scope).label}</T></T>
          <ChevronDown size={13} color={C.ink2} />
        </Pressable>
      </View>

      {ai && !text && examples.length > 0 ? (
        <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: '#f2fbf9', paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          <T s={12} c={C.muted}>Mzobs understands natural language — describe who you need and it turns it into filters you can edit. Try:</T>
          <View style={{ gap: 6, alignItems: 'flex-start' }}>
            {examples.map((q) => (
              <Press key={q} scale={0.98} onPress={() => { setText(q); submit(q) }} style={{ maxWidth: '100%', minHeight: 36, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#bfe6df', backgroundColor: '#fff', paddingHorizontal: 10 }}>
                <T s={12.5} c={C.accentText} numberOfLines={1}>“{q}”</T>
              </Press>
            ))}
          </View>
        </View>
      ) : null}

      {isBool ? (
        <View style={{ marginTop: 12, gap: 10, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <T s={11.5} w="s" c={C.muted} style={{ letterSpacing: 0.6 }}>INSERT</T>
            {[['AND', 'AND'], ['OR', 'OR'], ['NOT', 'NOT'], ['( )', '()'], ['" "', '""']].map(([label, snip]) => (
              <Pressable key={label} onPress={() => insert(snip)} style={{ minHeight: 34, minWidth: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 10 }}>
                <T s={12} w="s" c={C.ink2}>{label}</T>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowHelp((v) => !v)} style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 34 }}>
              <CircleHelp size={13} color={C.blue} />
              <T s={12} w="m" c={C.blue}>Syntax help</T>
            </Pressable>
          </View>

          {check && !check.ok ? (
            <View style={{ flexDirection: 'row', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: tried ? C.badSoft : C.warnSoft }}>
              <AlertCircle size={14} color={tried ? C.bad : C.warn} style={{ marginTop: 2 }} />
              <T s={12.5} c={tried ? C.bad : C.warn} style={{ flex: 1 }}>{check.error}{check.pos != null ? ` (at “${text.slice(check.pos, check.pos + 12).trim()}…”)` : ''}</T>
            </View>
          ) : null}
          {check?.ok && check.ast ? (
            <View style={{ flexDirection: 'row', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.blueSoft }}>
              <CheckCircle2 size={14} color="#185a94" style={{ marginTop: 2 }} />
              <T s={12.5} c="#185a94" style={{ flex: 1 }}>Reads as <T s={12} w="s" c="#185a94">{boolToString(check.ast)}</T></T>
            </View>
          ) : null}

          {showHelp || !text ? (
            <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, padding: 12, gap: 4 }}>
              {[['python AND aws', 'both (AND is optional)'], ['react OR vue', 'either'], ['NOT java', 'or -java — exclude'], ['(a OR b) AND c', 'group with brackets'], ['"machine learning"', 'exact phrase'], ['react*', 'wildcard']].map(([code, d]) => (
                <T key={code} s={12.5} c={C.ink2}><T s={12.5} w="s">{code}</T> — {d}</T>
              ))}
              {showHelp ? (
                <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, gap: 2 }}>
                  <T s={12.5} w="s">Search a specific field</T>
                  {FIELD_HELP.map(([f, d]) => <T key={f} s={12.5} c={C.ink2}><T s={12.5} w="s" c={C.blue}>{f}</T> {d}</T>)}
                </View>
              ) : null}
              <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, gap: 6, alignItems: 'flex-start' }}>
                <T s={11.5} w="s" c={C.muted} style={{ letterSpacing: 0.6 }}>TRY</T>
                {BOOLEAN_EXAMPLES.map((q) => (
                  <Press key={q} scale={0.98} onPress={() => { setText(q); submit(q) }} style={{ maxWidth: '100%', minHeight: 34, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#fff', paddingHorizontal: 10 }}>
                    <T s={12} c="#185a94" numberOfLines={1}>{q}</T>
                  </Press>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <Sheet open={scopeOpen} onClose={() => setScopeOpen(false)} title="Search in">
        {SCOPES.map((s) => (
          <Pressable key={s.id} onPress={() => { setScope(s.id); setScopeOpen(false) }} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line2 }}>
            <T s={14.5} w={s.id === scope ? 's' : 'r'} c={s.id === scope ? C.accent : C.ink}>{s.label}</T>
            {s.id === scope ? <Check size={16} color={C.accent} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </View>
  )
}
