import { useMemo, useRef } from 'react'
import { Animated, PanResponder, View } from 'react-native'
import { Check, X } from 'lucide-react-native'
import { C, T } from '../wk'
import { success, tap } from '../../lib/haptics'

const THRESHOLD = 88

/**
 * Swipe right to confirm (green), swipe left to dismiss (red). The row springs back either way — the
 * parent decides what the action does. Mostly-vertical drags are left to the scroll view.
 */
export default function SwipeRow({ children, onSwipeRight, onSwipeLeft, rightLabel = 'Shortlist', leftLabel = 'Reject', enabled = true }) {
  const x = useRef(new Animated.Value(0)).current
  const armed = useRef(false)
  const handlers = useRef({})
  handlers.current = { onSwipeRight, onSwipeLeft }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderMove: (_, g) => {
          const dx = (g.dx > 0 && !handlers.current.onSwipeRight) || (g.dx < 0 && !handlers.current.onSwipeLeft) ? 0 : g.dx
          x.setValue(Math.max(-140, Math.min(140, dx)))
          const past = Math.abs(dx) >= THRESHOLD
          if (past && !armed.current) tap()
          armed.current = past
        },
        onPanResponderRelease: (_, g) => {
          const fire = armed.current ? (g.dx > 0 ? handlers.current.onSwipeRight : handlers.current.onSwipeLeft) : null
          armed.current = false
          Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start()
          if (fire) {
            success()
            fire()
          }
        },
        onPanResponderTerminate: () => {
          armed.current = false
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start()
        },
      }),
    [x]
  )

  if (!enabled) return children
  return (
    <View>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, backgroundColor: C.line2 }}>
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' }) }}>
          <Check size={16} color={C.ok} /><T s={13} w="b" c={C.ok}>{rightLabel}</T>
        </Animated.View>
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
          <T s={13} w="b" c={C.bad}>{leftLabel}</T><X size={16} color={C.bad} />
        </Animated.View>
      </View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  )
}
