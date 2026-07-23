'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

/** Public-area guard: with an active session, sends to the dashboard. */
export function useRedirectAuthenticated() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [loading, user, router])

  return { allowed: !loading && !user }
}
