// Fails an EAS "production" build up front if the API URL is missing or plain http,
// instead of shipping an app that talks to localhost (or sends tokens unencrypted).
module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? ''
  const profile = (process.env.EAS_BUILD_PROFILE ?? '').replace(/^ios-/, '')
  if (profile === 'production') {
    if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL is not set for the "production" EAS build profile.')
    if (apiUrl.startsWith('http://')) throw new Error(`EXPO_PUBLIC_API_URL ("${apiUrl}") must be https:// for the "production" build.`)
  }
  return config
}
