import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Press_Start_2P, VT323 } from 'next/font/google'
import './globals.css'
import { Providers } from '@/providers'
import { Toaster } from '@/components/toaster'
import { CrtOverlay } from '@/components/crt-overlay'
import { PwaRegister } from '@/components/pwa-register'

// Retro-arcade type system: pixel font for titles/labels/buttons, VT323
// (terminal monospace) for body text — see tailwind.config.ts (font-pixel /
// font-arcade) for how these CSS vars are consumed.
const pixelFont = Press_Start_2P({ subsets: ['latin'], weight: '400', variable: '--font-pixel' })
const arcadeFont = VT323({ subsets: ['latin'], weight: '400', variable: '--font-arcade' })

export const metadata: Metadata = {
  title: 'Devs-Bet',
  description: 'Bet with your friends on matches — parimutuel odds, real balance.',
  // app/manifest.ts wires the <link rel="manifest"> automatically; these two
  // point at the icon routes in app/icons/ (custom routes, not the reserved
  // icon.tsx/apple-icon.tsx filenames, so the exact URL stays ours to control
  // and match against the manifest's icon list).
  icons: {
    icon: '/icons/favicon',
    apple: '/icons/apple-touch-icon',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Devs-Bet',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07040d',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${pixelFont.variable} ${arcadeFont.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
        <CrtOverlay />
        <PwaRegister />
      </body>
    </html>
  )
}
