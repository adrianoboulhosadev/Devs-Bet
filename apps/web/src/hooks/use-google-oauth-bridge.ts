'use client'

import { useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/auth-context'

/**
 * Bridges a completed NextAuth Google sign-in into OUR OWN session. NextAuth
 * only runs the OAuth handshake with Google (see lib/auth/options.ts) — the
 * instant it reports an authenticated session with an idToken, this hands that
 * token to the backend (AuthContext.loginWithGoogle -> POST /auth/oauth/google,
 * same access/refresh contract as a normal login) and then discards NextAuth's
 * own session (signOut) — it never becomes the app's source of truth.
 */
export function useGoogleOAuthBridge(onSuccess: () => void) {
  const { data: session, status } = useSession()
  const { loginWithGoogle } = useAuth()
  const handled = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated' || !session?.idToken || handled.current) return
    handled.current = true

    ;(async () => {
      try {
        await loginWithGoogle(session.idToken!)
        onSuccess()
      } catch (failure) {
        notify.failure(failure, 'Não foi possível entrar com o Google.')
      } finally {
        await signOut({ redirect: false })
      }
    })()
  }, [status, session, loginWithGoogle, onSuccess])
}
