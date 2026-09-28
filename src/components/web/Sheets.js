import { View } from 'react-native'
import { AlertCircle, Check, Sparkles } from 'lucide-react-native'
import { MATCH_LABELS } from '../../lib/talent/engine'
import { C, Chip, Sheet, StatusPill, T } from '../wk'

function Bar({ value }) {
  const color = value >= 85 ? C.ai : value >= 65 ? C.blue : C.amber
  return (
    <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: C.line2, overflow: 'hidden' }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${value}%` }} />
    </View>
  )
}

export function MatchSheet({ row, onClose }) {
  const c = row?.candidate
  const m = row?.match
  const parts = m ? Object.entries(m.parts).filter(([, v]) => v != null) : []
  return (
    <Sheet open={!!row} onClose={onClose} title="Why this candidate matches" subtitle={c && `${c.name} · ${c.designation}`}>
      {m ? (
        <View style={{ gap: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, backgroundColor: C.aiSoft, padding: 16 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <T s={18} w="b" c={C.accentText}>{m.overall}%</T>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color={C.ai} />
                <T s={14} w="s">Overall match</T>
              </View>
              <T s={12.5} c={C.muted}>Weighted across the {parts.length} requirement{parts.length === 1 ? '' : 's'} in your search.</T>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {parts.map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T s={13} c={C.ink2} style={{ width: 104 }}>{MATCH_LABELS[k]}</T>
                <Bar value={v} />
                <T s={13} w="s" style={{ width: 40, textAlign: 'right' }}>{v}%</T>
              </View>
            ))}
          </View>

          {m.strong.length > 0 ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Check size={14} color={C.okText} />
                <T s={13} w="s" c={C.okText}>Strong matches</T>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{m.strong.map((s) => <Chip key={s} tone="ok">{s}</Chip>)}</View>
            </View>
          ) : null}
          {m.weak.length > 0 || m.notes.length > 0 ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} color={C.warn} />
                <T s={13} w="s" c={C.warn}>Missing or weaker areas</T>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{m.weak.map((s) => <Chip key={s}>{s}</Chip>)}</View>
              {m.notes.map((n) => <T key={n} s={13} c={C.ink2}>• {n}</T>)}
            </View>
          ) : null}
          <View style={{ borderRadius: 8, backgroundColor: C.line2, paddingHorizontal: 12, paddingVertical: 8 }}>
            <T s={12} c={C.muted}>Scores come from a transparent rule-based comparison of the candidate's profile with your filters — no model is guessing.</T>
          </View>
        </View>
      ) : null}
    </Sheet>
  )
}

export function TrustSheet({ row, onClose }) {
  const t = row?.trust
  return (
    <Sheet open={!!row} onClose={onClose} title="Mzobs Trust Score" subtitle={row?.candidate?.name}>
      {t ? (
        <View style={{ gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <T s={40} w="b" style={{ lineHeight: 42 }}>{t.score}</T>
            <T s={14} c={C.muted} style={{ paddingBottom: 4 }}>/ 100</T>
          </View>
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: C.line }}>
            {t.rows.map((r, i) => (
              <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }}>
                <View style={{ flex: 1 }}>
                  <T s={13.5} w="m">{r.label}</T>
                  {r.detail ? <T s={12} c={C.muted}>{r.detail}</T> : null}
                </View>
                <StatusPill status={r.status} />
              </View>
            ))}
          </View>
          <View style={{ borderRadius: 8, backgroundColor: C.line2, paddingHorizontal: 12, paddingVertical: 8 }}>
            <T s={12} c={C.muted}>Only checks Mzobs has actually completed count as Verified. Pending counts partially; Not verified counts nothing. Profile completeness and activity are measured, not verified.</T>
          </View>
        </View>
      ) : null}
    </Sheet>
  )
}
