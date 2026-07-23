'use client'

import type { ReactNode } from 'react'
import { Loading } from '@/components/loading'
import { AppShell } from '@/components/app-shell'
import { useProtectRoute } from '@/hooks/use-protect-route'

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const { allowed } = useProtectRoute()
  if (!allowed) return <Loading />
  return <AppShell>{children}</AppShell>
}
