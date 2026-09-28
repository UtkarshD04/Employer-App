import { View } from 'react-native'
import { WebView } from 'react-native-webview'
import * as WebBrowser from 'expo-web-browser'
import { Download, ExternalLink } from 'lucide-react-native'
import { FILE_BASE_URL } from '../../lib/config'
import { Btn, C, Sheet } from '../wk'

// Word files can't render in a web view, so they go through Google's viewer — same approach as the website.
const OFFICE_DOC_RE = /\.(docx?|rtf|odt)$/i

/** `url` is the API's root-relative `/files/resume/:token` link (valid ~10 minutes). */
export const resumeHref = (url) => (/^https?:/i.test(url) ? url : `${FILE_BASE_URL}${url}`)

export function ResumeFrame({ url, fileName, height = 520 }) {
  const href = resumeHref(url)
  const uri = OFFICE_DOC_RE.test(fileName ?? '') ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(href)}` : href
  return (
    <View style={{ height, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, overflow: 'hidden' }}>
      <WebView source={{ uri }} nestedScrollEnabled startInLoadingState originWhitelist={['*']} setSupportMultipleWindows={false} />
    </View>
  )
}

// `?download=1` makes the API serve the CV as an attachment (the system browser then saves it).
export function ResumeLinks({ url }) {
  const href = resumeHref(url)
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Btn icon={ExternalLink} onPress={() => WebBrowser.openBrowserAsync(href)}>Open in browser</Btn>
      <Btn icon={Download} onPress={() => WebBrowser.openBrowserAsync(`${href}?download=1`)}>Download</Btn>
    </View>
  )
}

/** `file`: { url, fileName?, name } or null. */
export function ResumeViewer({ file, onClose }) {
  return (
    <Sheet open={!!file} onClose={onClose} title={file ? `${file.name} — CV` : 'CV'} subtitle={file?.fileName || undefined} footer={file && <ResumeLinks url={file.url} />}>
      {file ? <ResumeFrame url={file.url} fileName={file.fileName} height={460} /> : null}
    </Sheet>
  )
}
