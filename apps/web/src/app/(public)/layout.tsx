'use client'

import type { ReactNode } from 'react'
import { Loading } from '@/components/loading'
import { useRedirectAuthenticated } from '@/hooks/use-redirect-authenticated'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { allowed } = useRedirectAuthenticated()
  if (!allowed) return <Loading />
  return <>{children}</>
}
