'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

/** Private-area guard: without a session, redirects to login. */
export function useProtectRoute() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  return { allowed: !loading && Boolean(user) }
}
