'use client'

import type { ReactNode } from 'react'
import { Loading } from '@/components/loading'
import { AppShell } from '@/components/app-shell'
import { BetSlip } from '@/components/bet-slip'
import { BetSlipProvider } from '@/contexts/bet-slip-context'
import { useProtectRoute } from '@/hooks/use-protect-route'

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const { allowed } = useProtectRoute()
  if (!allowed) return <Loading />
  // The slip lives at the layout level so picks survive navigation between a
  // match, a tournament and back.
  return (
    <BetSlipProvider>
      <AppShell>{children}</AppShell>
      <BetSlip />
    </BetSlipProvider>
  )
}
