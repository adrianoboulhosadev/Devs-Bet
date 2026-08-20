'use client'

import type { ReactNode } from 'react'
import { Loading } from '@/components/loading'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { BetSlip } from '@/components/bet-slip'
import { BetSlipProvider } from '@/contexts/bet-slip-context'
import { MobileNavProvider } from '@/contexts/mobile-nav-context'
import { useProtectRoute } from '@/hooks/use-protect-route'
import { useNotificationStream } from '@/hooks/use-notification-stream'

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const { allowed } = useProtectRoute()
  // One live connection for the whole private area (the bell is only ever
  // mounted in here), so the inbox never needs a timer.
  useNotificationStream()

  if (!allowed) return <Loading fullScreen />

  // The outer box never scrolls: the rail stays put and only the column beside
  // it scrolls, which is what keeps the header sticky. Below `lg` the rail
  // leaves the flow altogether (it becomes an overlay drawer) and this turns
  // into a single full-width column.
  // The slip lives at the layout level so picks survive navigation between a
  // match, a tournament and back.
  return (
    <BetSlipProvider>
      <MobileNavProvider>
        <div className="flex h-screen overflow-hidden bg-arcade-bg">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <Header />
            {/* mx-auto é o que centraliza: um max-width sozinho cappa a largura mas
                deixa a caixa encostada na esquerda, sobrando espaço só de um lado. */}
            <main className="mx-auto w-full min-w-0 max-w-[1320px] flex-1 p-4 sm:p-6">
              {children}
            </main>
          </div>
        </div>
      </MobileNavProvider>
      <BetSlip />
    </BetSlipProvider>
  )
}
