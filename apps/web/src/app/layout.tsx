import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Press_Start_2P, VT323 } from 'next/font/google'
import './globals.css'
import { Providers } from '@/providers'
import { Toaster } from '@/components/toaster'
import { CrtOverlay } from '@/components/crt-overlay'

// Retro-arcade type system: pixel font for titles/labels/buttons, VT323
// (terminal monospace) for body text — see tailwind.config.ts (font-pixel /
// font-arcade) for how these CSS vars are consumed.
const pixelFont = Press_Start_2P({ subsets: ['latin'], weight: '400', variable: '--font-pixel' })
const arcadeFont = VT323({ subsets: ['latin'], weight: '400', variable: '--font-arcade' })

export const metadata: Metadata = {
  title: 'Devs-Bet',
  description: 'Bet with your friends on matches — parimutuel odds, real balance.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${pixelFont.variable} ${arcadeFont.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
        <CrtOverlay />
      </body>
    </html>
  )
}
