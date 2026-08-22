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

      {/* Quebra de linha E divisória, no mesmo elemento: um item de largura
          total num container `flex-wrap` empurra tudo o que vem depois pra
          linha de baixo, e a borda de cima dele vira o traço entre as duas
          faixas. As margens negativas levam o traço até as bordas do header,
          por baixo do padding lateral. */}
      <span
        aria-hidden
        className="-mx-4 w-[calc(100%+2rem)] border-t-3 border-arcade-border-strong sm:-mx-6 sm:w-[calc(100%+3rem)] lg:hidden"
      />

      {/* Faixa de baixo no celular/tablet: o saldo em corpo grande, com o
          rótulo em cima, ocupando a linha até o botão. No desktop volta a ser a
          caixinha de sempre, ao lado dos outros itens. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-none lg:flex-row lg:items-center lg:gap-3 lg:border-3 lg:border-arcade-border lg:bg-arcade-surface lg:px-4 lg:py-2">
        <span className="font-pixel text-[9px] tracking-wide text-arcade-text-muted">CRÉDITOS</span>
        <span className="text-3xl leading-none text-arcade-amber lg:text-2xl">{formatBRL(available)}</span>
      </div>
      <Link href="/wallet" className="flex-none">
        <Button variant="success">+ Fichas</Button>
      </Link>
    </header>
  )
}
