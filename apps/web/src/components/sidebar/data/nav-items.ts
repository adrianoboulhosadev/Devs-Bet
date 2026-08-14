import type { ReactNode } from 'react'
import {
  AdminIcon,
  BetsIcon,
  CategoriesIcon,
  DashboardIcon,
  LeaderboardIcon,
  MatchesIcon,
  ParticipantsIcon,
  TournamentsIcon,
  WalletIcon,
} from './icons'

export interface NavItem {
  href: string
  label: string
  icon: () => ReactNode
  adminOnly?: boolean
}

// Sidebar-only (unlike the reference project, this app has no mobile tab bar
// duplicating the same list), so it lives with the component instead of in the
// shared src/data.
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: DashboardIcon },
  { href: '/matches', label: 'Partidas', icon: MatchesIcon },
  { href: '/tournaments', label: 'Torneios', icon: TournamentsIcon },
  { href: '/bets', label: 'Minhas apostas', icon: BetsIcon },
  { href: '/leaderboard', label: 'Placar geral', icon: LeaderboardIcon },
  { href: '/wallet', label: 'Créditos', icon: WalletIcon },
  { href: '/categories', label: 'Categorias', icon: CategoriesIcon, adminOnly: true },
  { href: '/participants', label: 'Participantes', icon: ParticipantsIcon },
  { href: '/admin', label: 'Sala de controle', icon: AdminIcon, adminOnly: true },
]
