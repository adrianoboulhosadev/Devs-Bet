import type { NotificationType } from '@notification/adapters'

/**
 * The accent color of an inbox line, by what the event MEANS rather than by
 * which context raised it — so a glance at the bell reads as good news / bad
 * news / something waiting on the admin, without reading a word.
 *
 * Hex instead of a Tailwind class because these are applied inline (same as the
 * leaderboard's position colors): the type comes from data, and Tailwind cannot
 * see a class name it never finds in the source.
 */
const ACCENTS: Record<NotificationType, string> = {
  bet_won: '#b6ff3d', // arcade-lime
  combo_won: '#b6ff3d',
  deposit_confirmed: '#b6ff3d',
  withdrawal_paid: '#b6ff3d',
  account_approved: '#b6ff3d',

  bet_lost: '#ff4d4d', // arcade-danger
  combo_lost: '#ff4d4d',
  deposit_rejected: '#ff4d4d',
  withdrawal_rejected: '#ff4d4d',

  bet_refunded: '#22e6ff', // arcade-cyan — neutral, money came back
  combo_refunded: '#22e6ff',

  comment_reply: '#c77dff', // arcade-purple — someone talking to you, not money

  admin_signup_pending: '#ffb020', // arcade-amber — waiting on the admin
  admin_deposit_pending: '#ffb020',
  admin_withdrawal_pending: '#ffb020',
}

export function accentFor(type: NotificationType): string {
  return ACCENTS[type] ?? '#8b7bb8'
}
