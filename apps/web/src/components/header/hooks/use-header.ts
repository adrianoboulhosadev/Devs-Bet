'use client'

import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { WalletDTO } from '@wallet/adapters'
import { useMobileNav } from '@/contexts/mobile-nav-context'
import { api } from '@/lib/api'
import { screenTitleFor } from '../data/screen-titles'

export function useHeader() {
  const pathname = usePathname()
  const { toggle: openNav } = useMobileNav()

  const wallet = useQuery({
    queryKey: ['wallet'],
    queryFn: async (): Promise<WalletDTO> => (await api.get<WalletDTO>('/wallet/me')).data,
  })

  const [kicker, title] = screenTitleFor(pathname)

  return { kicker, title, available: wallet.data?.available ?? 0, openNav }
}
