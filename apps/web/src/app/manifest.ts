import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Devs-Bet',
    short_name: 'Devs-Bet',
    description: 'Bet with your friends on matches — parimutuel odds, real balance.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07040d',
    theme_color: '#07040d',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
