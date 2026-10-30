import { Component } from 'react'
import { View } from 'react-native'
import { AlertCircle } from 'lucide-react-native'
import { Btn, C, T } from './wk'

// A render error in one screen shows this instead of a white screen; "Try again" re-mounts the tree.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    if (__DEV__) console.warn('Screen crashed', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, backgroundColor: C.bg }}>
        <AlertCircle size={28} color={C.bad} />
        <T s={17} w="s" style={{ textAlign: 'center' }}>Something went wrong</T>
        <T s={13.5} c={C.muted} style={{ textAlign: 'center' }}>This screen hit an unexpected problem. Your data is safe.</T>
        <Btn variant="primary" onPress={() => this.setState({ failed: false })}>Try again</Btn>
      </View>
    )
  }
}
