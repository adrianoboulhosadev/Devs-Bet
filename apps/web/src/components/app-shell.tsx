'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode, type SVGProps } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { WalletDTO } from '@wallet/adapters'
import { useAuth } from '@/contexts/auth-context'
import { useProfileStats } from '@/hooks/use-profile-stats'
import { mediaUrl } from '@/lib/media'
import { formatBRL } from '@/lib/money'
import { api } from '@/lib/api'
import { Button } from './button'
import { NotificationBell } from './notification-bell'

// Every icon is a 16x16 grid of blocky rects — same pixel-art language as the
// mockup. The "cutout" rects are hardcoded to the sidebar's own background
// (#0d0818, arcade-header) because the app has no light theme to clash with.
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" width={22} height={22} fill="currentColor" className="shrink-0" {...props}>
      {children}
    </svg>
  )
}

const DashboardIcon = () => (
  <Icon>
    <rect x="1" y="1" width="6" height="6" />
    <rect x="9" y="1" width="6" height="6" />
    <rect x="1" y="9" width="6" height="6" />
    <rect x="9" y="9" width="6" height="6" />
  </Icon>
)
const MatchesIcon = () => (
  <Icon>
    <rect x="1" y="3" width="5" height="10" />
    <rect x="10" y="3" width="5" height="10" />
    <rect x="7" y="6" width="2" height="2" />
    <rect x="7" y="9" width="2" height="2" />
  </Icon>
)
const TournamentsIcon = () => (
  <Icon>
    <rect x="3" y="1" width="10" height="6" />
    <rect x="1" y="2" width="2" height="3" />
    <rect x="13" y="2" width="2" height="3" />
    <rect x="7" y="7" width="2" height="4" />
    <rect x="4" y="12" width="8" height="3" />
  </Icon>
)
const BetsIcon = () => (
  <Icon>
    <rect x="1" y="3" width="14" height="10" />
    <rect x="3" y="6" width="7" height="1" fill="#0d0818" />
    <rect x="3" y="9" width="5" height="1" fill="#0d0818" />
  </Icon>
)
const LeaderboardIcon = () => (
  <Icon>
    <rect x="1" y="9" width="4" height="6" />
    <rect x="6" y="4" width="4" height="11" />
    <rect x="11" y="7" width="4" height="8" />
  </Icon>
)
const WalletIcon = () => (
  <Icon>
    <rect x="3" y="1" width="10" height="14" />
    <rect x="1" y="3" width="2" height="10" />
    <rect x="13" y="3" width="2" height="10" />
    <rect x="7" y="4" width="2" height="8" fill="#0d0818" />
  </Icon>
)
const CategoriesIcon = () => (
  <Icon>
    <rect x="1" y="2" width="6" height="3" />
    <rect x="1" y="7" width="6" height="3" />
    <rect x="1" y="12" width="6" height="3" />
    <rect x="9" y="3" width="6" height="2" />
    <rect x="9" y="8" width="6" height="2" />
  </Icon>
)
const ParticipantsIcon = () => (
  <Icon>
    <rect x="5" y="1" width="6" height="6" />
    <rect x="2" y="9" width="12" height="6" />
  </Icon>
)
const AdminIcon = () => (
  <Icon>
    <rect x="6" y="1" width="4" height="14" />
    <rect x="1" y="6" width="14" height="4" />
    <rect x="6" y="6" width="4" height="4" fill="#0d0818" />
  </Icon>
)
const LogoutIcon = () => (
  <Icon>
    <rect x="1" y="1" width="7" height="14" />
    <rect x="9" y="7" width="6" height="2" />
    <rect x="11" y="4" width="2" height="2" />
    <rect x="11" y="10" width="2" height="2" />
  </Icon>
)

interface NavItem {
  href: string
  label: string
  icon: () => ReactNode
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: DashboardIcon },
  { href: '/matches', label: 'Partidas', icon: MatchesIcon },
  { href: '/tournaments', label: 'Torneios', icon: TournamentsIcon },
  { href: '/bets', label: 'Minhas apostas', icon: BetsIcon },
  { href: '/leaderboard', label: 'Placar geral', icon: LeaderboardIcon },
  { href: '/wallet', label: 'Créditos', icon: WalletIcon },
  { href: '/categories', label: 'Categorias', icon: CategoriesIcon, adminOnly: true },
  { href: '/participants', label: 'Participantes', icon: ParticipantsIcon, adminOnly: true },
  { href: '/admin', label: 'Sala de controle', icon: AdminIcon, adminOnly: true },
]

const SCREEN_TITLES: Record<string, [string, string]> = {
  dashboard: ['BEM-VINDO DE VOLTA', 'PAINEL DO APOSTADOR'],
  matches: ['ESCOLHA SUA MESA', 'LOBBY DE PARTIDAS'],
  'matches-detail': ['MODO ARENA', 'DETALHE DA PARTIDA'],
  tournaments: ['CHAVES E CAMPEÕES', 'TORNEIOS'],
  'tournaments-detail': ['CHAVE E CONFRONTOS', 'DETALHE DO TORNEIO'],
  bets: ['SUAS APOSTAS', 'MINHAS APOSTAS'],
  leaderboard: ['TEMPORADA ATUAL', 'PLACAR GERAL'],
  wallet: ['CARTEIRA E PIX', 'CRÉDITOS'],
  categories: ['ORGANIZAÇÃO', 'CATEGORIAS'],
  participants: ['CATÁLOGO', 'PARTICIPANTES'],
  admin: ['ACESSO RESTRITO', 'SALA DE CONTROLE'],
  profile: ['FICHA DO JOGADOR', 'PERFIL'],
  notifications: ['CAIXA DE ENTRADA', 'NOTIFICAÇÕES'],
}

function screenTitleFor(pathname: string): [string, string] {
  const segments = pathname.split('/').filter(Boolean)
  const root = segments[0] ?? 'dashboard'
  const key = segments.length > 1 ? `${root}-detail` : root
  return SCREEN_TITLES[key] ?? SCREEN_TITLES[root] ?? SCREEN_TITLES.dashboard
}

/** Chrome of the private area: retro-arcade collapsible sidebar + header, wrapping every private page. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const { data: profile } = useProfileStats()

  const wallet = useQuery({
    queryKey: ['wallet'],
    queryFn: async (): Promise<WalletDTO> => (await api.get<WalletDTO>('/wallet/me')).data,
  })

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
  const [kicker, title] = screenTitleFor(pathname)
  const displayName = profile?.nickname || user?.email.split('@')[0] || ''
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-arcade-bg">
      <aside
        className="z-[60] flex h-screen flex-none flex-col overflow-hidden border-r-3 border-arcade-border-strong bg-arcade-header transition-[width] duration-300"
        style={{ width: expanded ? 252 : 74 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex w-full items-center gap-3.5 border-b-3 border-arcade-border-strong px-5 py-5 text-left"
        >
          <span className="grid h-8 w-8 flex-none place-items-center bg-arcade-magenta font-pixel text-xs text-arcade-bg shadow-pixel-sm">
            D
          </span>
          <span
            className={`whitespace-nowrap font-pixel text-[13px] text-arcade-text transition-opacity ${expanded ? 'opacity-100' : 'opacity-0'}`}
          >
            DEVS·BET
          </span>
        </button>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2.5 py-3.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-3 py-2.5 text-[15px] tracking-wide transition-colors hover:bg-[#1d1233] hover:text-arcade-lime ${
                  active ? 'bg-[#2a1150] text-arcade-magenta shadow-[inset_4px_0_0_#ff3d81]' : 'text-arcade-text-soft'
                }`}
              >
                <item.icon />
                <span className={`whitespace-nowrap transition-opacity ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="flex-none border-t-3 border-arcade-border-strong px-2.5 py-3.5">
          <Link href="/profile" className="flex items-center gap-3.5 px-3 py-2 pb-3.5">
            <span className="grid h-[30px] w-[30px] flex-none place-items-center overflow-hidden bg-arcade-cyan font-pixel text-[10px] text-arcade-bg shadow-pixel-sm">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(profile.avatarUrl)} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span className={`whitespace-nowrap transition-opacity ${expanded ? 'opacity-100' : 'opacity-0'}`}>
              <span className="block text-lg leading-none text-arcade-text">{displayName.toUpperCase()}</span>
              <span className="block text-base leading-tight text-arcade-text-muted">
                {profile ? `nível ${profile.level} · apostador` : 'apostador'}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3.5 px-3 py-2.5 text-left text-[15px] text-arcade-text-muted hover:text-arcade-danger"
          >
            <LogoutIcon />
            <span className={`whitespace-nowrap transition-opacity ${expanded ? 'opacity-100' : 'opacity-0'}`}>Sair</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-50 flex flex-none flex-wrap items-center gap-4 gap-y-3 border-b-3 border-arcade-border-strong bg-arcade-header px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2" style={{ flexBasis: 240 }}>
            <span className="font-pixel text-[9px] leading-relaxed tracking-widest text-arcade-text-muted">{kicker}</span>
            <span className="font-pixel text-xs leading-relaxed text-arcade-lime sm:text-sm">{title}</span>
          </div>
          <NotificationBell />
          <div className="flex items-center gap-3 border-3 border-arcade-border bg-arcade-surface px-4 py-2">
            <span className="font-pixel text-[9px] tracking-wide text-arcade-text-muted">CRÉDITOS</span>
            <span className="text-2xl leading-none text-arcade-amber">
              {formatBRL(wallet.data?.available ?? 0)}
            </span>
          </div>
          <Link href="/wallet">
            <Button variant="success">+ Fichas</Button>
          </Link>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6" style={{ maxWidth: 1320 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
