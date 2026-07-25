'use client'

import type { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Loading } from '@/components/loading'
import { useRedirectAuthenticated } from '@/hooks/use-redirect-authenticated'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { allowed } = useRedirectAuthenticated()

  // NextAuth's session (Google sign-in bridge, see useGoogleOAuthBridge) is
  // only ever needed on these public pages (login/register) — scoped here
  // instead of the whole app.
  return (
    <SessionProvider>
      {!allowed ? <Loading /> : children}
    </SessionProvider>
  )
}
