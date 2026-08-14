/** Arcade-cabinet marquee for each screen: [kicker, title]. */
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

export function screenTitleFor(pathname: string): [string, string] {
  const segments = pathname.split('/').filter(Boolean)
  const root = segments[0] ?? 'dashboard'
  const key = segments.length > 1 ? `${root}-detail` : root
  return SCREEN_TITLES[key] ?? SCREEN_TITLES[root] ?? SCREEN_TITLES.dashboard
}
