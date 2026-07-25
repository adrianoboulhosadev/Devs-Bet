// Augments NextAuth's session/token with the Google ID token our bridge needs
// (see lib/auth/options.ts and hooks/use-google-oauth-bridge.ts). NextAuth's
// session is a disposable bridge here, not the app's own session — this is
// the only extra field it carries.
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    idToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    idToken?: string
  }
}
