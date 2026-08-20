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
  //
  // The arcade cabinet around the content (full-screen radial backdrop + the
  // centred max-w-md card) is IDENTICAL on login, register and pending, so it
  // lives here instead of being pasted into each page. The Loading guard stays
  // OUTSIDE it: `fullScreen` claims the viewport and would be squeezed by the
  // card's max-width.
  return (
    <SessionProvider>
      {!allowed ? (
        <Loading fullScreen />
      ) : (
        <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_50%_30%,#1c0f38_0%,#07040d_70%)] px-6 py-10">
          {/* `min-w-0` não é decoração: a largura mínima automática de um item
              de grid é o min-content dele, então um filho largo (o rótulo do
              botão, sem quebra) esticava o card ALÉM da viewport — e item que
              transborda deixa de ser centralizado pelo `place-items-center`
              (alinha no início), que é o que colava o card na direita no
              celular. */}
          <div className="w-full min-w-0 max-w-md animate-scrIn text-center">{children}</div>
        </main>
      )}
    </SessionProvider>
  )
}
