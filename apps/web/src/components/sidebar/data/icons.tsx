import type { ReactNode, SVGProps } from 'react'

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

export const DashboardIcon = () => (
  <Icon>
    <rect x="1" y="1" width="6" height="6" />
    <rect x="9" y="1" width="6" height="6" />
    <rect x="1" y="9" width="6" height="6" />
    <rect x="9" y="9" width="6" height="6" />
  </Icon>
)

export const MatchesIcon = () => (
  <Icon>
    <rect x="1" y="3" width="5" height="10" />
    <rect x="10" y="3" width="5" height="10" />
    <rect x="7" y="6" width="2" height="2" />
    <rect x="7" y="9" width="2" height="2" />
  </Icon>
)

export const TournamentsIcon = () => (
  <Icon>
    <rect x="3" y="1" width="10" height="6" />
    <rect x="1" y="2" width="2" height="3" />
    <rect x="13" y="2" width="2" height="3" />
    <rect x="7" y="7" width="2" height="4" />
    <rect x="4" y="12" width="8" height="3" />
  </Icon>
)

export const BetsIcon = () => (
  <Icon>
    <rect x="1" y="3" width="14" height="10" />
    <rect x="3" y="6" width="7" height="1" fill="#0d0818" />
    <rect x="3" y="9" width="5" height="1" fill="#0d0818" />
  </Icon>
)

export const LeaderboardIcon = () => (
  <Icon>
    <rect x="1" y="9" width="4" height="6" />
    <rect x="6" y="4" width="4" height="11" />
    <rect x="11" y="7" width="4" height="8" />
  </Icon>
)

export const WalletIcon = () => (
  <Icon>
    <rect x="3" y="1" width="10" height="14" />
    <rect x="1" y="3" width="2" height="10" />
    <rect x="13" y="3" width="2" height="10" />
    <rect x="7" y="4" width="2" height="8" fill="#0d0818" />
  </Icon>
)

export const CategoriesIcon = () => (
  <Icon>
    <rect x="1" y="2" width="6" height="3" />
    <rect x="1" y="7" width="6" height="3" />
    <rect x="1" y="12" width="6" height="3" />
    <rect x="9" y="3" width="6" height="2" />
    <rect x="9" y="8" width="6" height="2" />
  </Icon>
)

export const ParticipantsIcon = () => (
  <Icon>
    <rect x="5" y="1" width="6" height="6" />
    <rect x="2" y="9" width="12" height="6" />
  </Icon>
)

export const AdminIcon = () => (
  <Icon>
    <rect x="6" y="1" width="4" height="14" />
    <rect x="1" y="6" width="14" height="4" />
    <rect x="6" y="6" width="4" height="4" fill="#0d0818" />
  </Icon>
)

export const LogoutIcon = () => (
  <Icon>
    <rect x="1" y="1" width="7" height="14" />
    <rect x="9" y="7" width="6" height="2" />
    <rect x="11" y="4" width="2" height="2" />
    <rect x="11" y="10" width="2" height="2" />
  </Icon>
)
