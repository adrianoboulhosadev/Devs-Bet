import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { Providers } from '@/providers'

export const metadata: Metadata = {
  title: 'Devs-Bet',
  description: 'Bet with your friends on matches — parimutuel odds, real balance.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
