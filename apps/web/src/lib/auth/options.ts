import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

/**
 * NextAuth is used ONLY to run the OAuth handshake with Google — it is a
 * disposable bridge, never the app's session system. Once the handshake
 * completes, the front reads the Google ID token off the NextAuth session
 * (see useGoogleOAuthBridge) and posts it to the backend's own
 * POST /auth/oauth/google, which verifies it and issues the SAME
 * access/refresh session as a normal email+password login. NextAuth's own
 * session is discarded (signOut) right after — nothing here ever becomes the
 * source of truth for who is logged in.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    // `account` is only present right after the OAuth redirect completes —
    // carries the Google ID token we need to hand to the backend.
    async jwt({ token, account }) {
      if (account?.id_token) token.idToken = account.id_token
      return token
    },
    async session({ session, token }) {
      session.idToken = token.idToken
      return session
    },
  },
}
