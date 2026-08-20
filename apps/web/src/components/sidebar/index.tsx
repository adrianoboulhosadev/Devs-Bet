'use client'

import Link from 'next/link'
import { mediaUrl } from '@/lib/media'
import { CloseIcon, LogoutIcon } from './data/icons'
import { useSidebar } from './hooks/use-sidebar'

/**
 * Retro-arcade navigation rail of the private area. Collapsed it shows only the
 * pixel icons; clicking the logo widens it and fades the labels in. See Header
 * for the top bar it sits next to.
 *
 * Below `lg` it is NOT a column of the layout: it becomes a drawer that slides
 * OVER the content, opened by the header's menu button. That is deliberate — as
 * a layout column even the collapsed 74px rail ate the width of a phone screen
 * and squeezed every page next to it.
 */
export function Sidebar() {
  const {
    profile,
    logout,
    expanded,
    toggle,
    items,
    isActive,
    displayName,
    initials,
    drawerOpen,
    closeDrawer,
  } = useSidebar()

  // Labels are always readable in the drawer (it opens at full width); only the
  // desktop rail fades them out while collapsed.
  const labelClass = `whitespace-nowrap transition-opacity ${expanded ? 'lg:opacity-100' : 'lg:opacity-0'}`

  return (
    <>
      {/* Sits between the header (z-50) and the drawer (z-70) so a tap anywhere
          off the menu closes it. */}
      {drawerOpen && (
        <div
          aria-hidden
          onClick={closeDrawer}
          className="fixed inset-0 z-[65] bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex h-screen w-[252px] flex-none flex-col overflow-hidden border-r-3 border-arcade-border-strong bg-arcade-header transition-transform duration-300 lg:static lg:z-[60] lg:translate-x-0 lg:transition-[width] ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${expanded ? 'lg:w-[252px]' : 'lg:w-[74px]'}`}
      >
        <div className="flex flex-none items-center border-b-3 border-arcade-border-strong">
          <button
            type="button"
            onClick={toggle}
            className="flex min-w-0 flex-1 items-center gap-3.5 px-5 py-5 text-left"
          >
            <span className="grid h-8 w-8 flex-none place-items-center bg-arcade-magenta font-pixel text-xs text-arcade-bg shadow-pixel-sm">
              D
            </span>
            <span className={`font-pixel text-[13px] text-arcade-text ${labelClass}`}>DEVS·BET</span>
          </button>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Fechar menu"
            className="flex-none px-4 py-5 text-arcade-text-muted hover:text-arcade-magenta lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2.5 py-3.5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeDrawer}
              className={`flex items-center gap-3.5 px-3 py-2.5 text-[15px] tracking-wide transition-colors hover:bg-[#1d1233] hover:text-arcade-lime ${
                isActive(item.href)
                  ? 'bg-[#2a1150] text-arcade-magenta shadow-[inset_4px_0_0_#ff3d81]'
                  : 'text-arcade-text-soft'
              }`}
            >
              <item.icon />
              <span className={labelClass}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex-none border-t-3 border-arcade-border-strong px-2.5 py-3.5">
          <Link
            href="/profile"
            onClick={closeDrawer}
            className="flex items-center gap-3.5 px-3 py-2 pb-3.5"
          >
            <span className="grid h-[30px] w-[30px] flex-none place-items-center overflow-hidden bg-arcade-cyan font-pixel text-[10px] text-arcade-bg shadow-pixel-sm">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(profile.avatarUrl)} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span className={labelClass}>
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
            <span className={labelClass}>Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}
