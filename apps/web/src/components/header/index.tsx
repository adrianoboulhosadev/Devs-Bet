'use client'

import Link from 'next/link'
import { formatBRL } from '@/lib/money'
import { Button } from '../button'
import { NotificationBell } from '../notification-bell'
import { useHeader } from './hooks/use-header'

// Same pixel-art language as the sidebar icons: a 16x16 grid of rects.
const MenuIcon = () => (
  <svg viewBox="0 0 16 16" width={22} height={22} fill="currentColor" className="shrink-0">
    <rect x="1" y="3" width="14" height="2" />
    <rect x="1" y="7" width="14" height="2" />
    <rect x="1" y="11" width="14" height="2" />
  </svg>
)

/** Top bar of the private area: screen marquee, inbox bell, balance and the shortcut to top up. */
export function Header() {
  const { kicker, title, available, openNav } = useHeader()

  // Duas faixas no celular e no tablet — menu / assunto da tela / sino em cima,
  // saldo e "+ fichas" embaixo — e uma linha só no desktop. A quebra é feita
  // pelo separador lá embaixo, não por `flex-wrap` livre: assim a segunda faixa
  // é sempre a mesma dupla, em vez de mudar de composição conforme a largura.
  //
  // `lg:h-[81px]` casa com a altura do bloco do logo na Sidebar: as duas bordas
  // de baixo são a MESMA linha horizontal atravessando a tela, e sem uma altura
  // combinada elas ficavam ~6px desencontradas (o conteúdo de cada lado é que
  // mandava). Só de `lg` pra cima — abaixo disso o header tem duas faixas e uma
  // altura fixa cortaria conteúdo.
  return (
    <header className="sticky top-0 z-50 flex flex-none flex-wrap items-center gap-4 gap-y-3 border-b-3 border-arcade-border-strong bg-arcade-header px-4 py-4 sm:px-6 lg:h-[81px]">
      {/* The only way to the navigation below `lg`, where the rail is a drawer. */}
      <button
        type="button"
        onClick={openNav}
        aria-label="Abrir menu"
        className="grid h-[46px] w-[46px] flex-none place-items-center border-3 border-arcade-border bg-arcade-surface text-arcade-text-soft transition-colors hover:border-arcade-cyan hover:text-arcade-cyan lg:hidden"
      >
        <MenuIcon />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:basis-60">
        <span className="font-pixel text-[9px] leading-relaxed tracking-widest text-arcade-text-muted">{kicker}</span>
        <span className="font-pixel text-xs leading-relaxed text-arcade-lime sm:text-sm">{title}</span>
      </div>
      <NotificationBell />

      {/* Só quebra de linha, sem desenho nenhum: um item de largura total num
          container `flex-wrap` empurra pra linha de baixo tudo o que vem depois
          dele. É o que separa as duas faixas no celular — o espaço entre elas é
          o `gap-y` do header. */}
      <span aria-hidden className="w-full lg:hidden" />

      {/* Saldo e "+ fichas" andam juntos: são a faixa de baixo no celular
          (rótulo em cima do valor, botão na outra ponta) e, no desktop, duas
          colunas de MESMA largura — é o `grid-cols-2` que iguala as duas, e a
          altura de 46px é a mesma do sino, então os três blocos da direita
          fecham na mesma linha. */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4 lg:grid lg:flex-none lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1 lg:h-[46px] lg:flex-row lg:items-center lg:justify-center lg:gap-3 lg:border-3 lg:border-arcade-border lg:bg-arcade-surface lg:px-4">
          <span className="font-pixel text-[9px] tracking-wide text-arcade-text-muted">CRÉDITOS</span>
          <span className="text-3xl leading-none text-arcade-amber lg:text-2xl">{formatBRL(available)}</span>
        </div>
        <Link href="/wallet" className="flex-none lg:w-full">
          <Button variant="success" className="lg:h-[46px] lg:w-full">
            + Fichas
          </Button>
        </Link>
      </div>
    </header>
  )
}
