'use client'

import Link from 'next/link'
import { mediaUrl } from '@/lib/media'
import { LogoutIcon } from './data/icons'
import { useSidebar } from './hooks/use-sidebar'

/**
 * Retro-arcade navigation rail of the private area. Collapsed it shows only the
 * pixel icons; clicking the logo widens it and fades the labels in. See Header
 * for the top bar it sits next to.
 */
export function Sidebar() {
  const { profile, logout, expanded, toggle, items, isActive, displayName, initials } = useSidebar()

  return (
    <aside
      className="z-[60] flex h-screen flex-none flex-col overflow-hidden border-r-3 border-arcade-border-strong bg-arcade-header transition-[width] duration-300"
      style={{ width: expanded ? 252 : 74 }}
    >
      <button
        type="button"
        onClick={toggle}
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
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3.5 px-3 py-2.5 text-[15px] tracking-wide transition-colors hover:bg-[#1d1233] hover:text-arcade-lime ${
              isActive(item.href)
                ? 'bg-[#2a1150] text-arcade-magenta shadow-[inset_4px_0_0_#ff3d81]'
                : 'text-arcade-text-soft'
            }`}
          >
            <item.icon />
            <span className={`whitespace-nowrap transition-opacity ${expanded ? 'opacity-100' : 'opacity-0'}`}>
              {item.label}
            </span>
          </Link>
        ))}
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
  )
}
