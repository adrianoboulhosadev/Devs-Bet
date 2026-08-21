export const NOTIFICATION_TYPES = [
  // bettor — a simple bet was graded
  'bet_won',
  'bet_lost',
  'bet_refunded',
  // bettor — a combo (parlay) ticket was graded
  'combo_won',
  'combo_lost',
  'combo_refunded',
  // bettor — money
  'deposit_confirmed',
  'deposit_rejected',
  'withdrawal_paid',
  'withdrawal_rejected',
  // bettor — the front door
  'account_approved',
  // bettor — somebody answered a comment of theirs on a match/tournament/poll
  'comment_reply',
  // admin — something is waiting in the control room
  'admin_signup_pending',
  'admin_deposit_pending',
  'admin_withdrawal_pending',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/** Which market a bet belonged to — also which page a comment thread lives on.
 * Kept as its own tiny union instead of importing betting's BetMarketType —
 * notification touches no other context. */
export type NotificationMarketKind = 'match' | 'tournament' | 'poll'

interface Recipient {
  /** Who receives it. A logical FK to users — notification owns no identity. */
  userId: string
  /** The thing that caused it (bet id, payment id, …). Together with
   * (userId, type) it is what makes delivery IDEMPOTENT — see the repository. */
  referenceId?: string | null
}

interface MarketRef {
  marketKind: NotificationMarketKind
  marketId: string
  marketTitle: string
}

/**
 * Everything needed to WRITE a notification, one shape per type (discriminated
 * union): each event carries only the facts its copy actually uses, so a caller
 * cannot forget the payout of a win or invent a field. `Notification.for`
 * turns one of these into the finished entity.
 */
export type NotificationInput =
  | (Recipient & MarketRef & { type: 'bet_won'; payout: number })
  | (Recipient & MarketRef & { type: 'bet_lost'; stake: number })
  | (Recipient & MarketRef & { type: 'bet_refunded'; stake: number })
  | (Recipient & { type: 'combo_won'; legs: number; payout: number })
  | (Recipient & { type: 'combo_lost'; legs: number; stake: number })
  | (Recipient & { type: 'combo_refunded'; legs: number; stake: number })
  | (Recipient & { type: 'deposit_confirmed'; amount: number })
  | (Recipient & { type: 'deposit_rejected'; amount: number })
  | (Recipient & { type: 'withdrawal_paid'; amount: number })
  | (Recipient & { type: 'withdrawal_rejected'; amount: number; reason: string })
  | (Recipient & { type: 'account_approved' })
  | (Recipient & {
      type: 'comment_reply'
      /** Who replied — a nickname or a truncated id, resolved by the app layer
       * (same labelling the pending-payment alerts use; never an e-mail). */
      authorLabel: string
      /** Where the conversation is, so the inbox line can link straight to it. */
      subjectKind: NotificationMarketKind
      subjectId: string
      /** A single-line excerpt of the reply — the inbox quotes, it does not
       * reproduce (see CommentBody.preview). */
      excerpt: string
    })
  | (Recipient & { type: 'admin_signup_pending'; signupEmail: string })
  | (Recipient & { type: 'admin_deposit_pending'; bettorLabel: string; amount: number })
  | (Recipient & { type: 'admin_withdrawal_pending'; bettorLabel: string; amount: number })
