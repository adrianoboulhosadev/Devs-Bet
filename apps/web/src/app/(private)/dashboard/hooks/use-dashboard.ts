'use client'

import { useAuth } from '@/contexts/auth-context'

export function useDashboard() {
  const { user, isAdmin } = useAuth()
  return { user, isAdmin }
}
