'use client'

import { signIn } from 'next-auth/react'
import { Button } from '../button'

/**
 * Triggers the NextAuth Google handshake (redirect to Google and back). The
 * actual login into OUR session happens afterwards, on this same page, via
 * useGoogleOAuthBridge — this button only starts the OAuth dance.
 */
export function GoogleSignInButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      onClick={() => signIn('google')}
    >
      Continuar com Google
    </Button>
  )
}
