import { Entity, EntityProps, Money } from 'shared'

/** Every kind of balance movement recorded in the append-only ledger. */
export type LedgerEntryType =
  | 'deposit'
  | 'bet_hold'
  | 'bet_won'
  | 'bet_lost'
  | 'refund'
  | 'withdrawal'

export interface LedgerEntryProps extends EntityProps {
  walletId: string
  type: LedgerEntryType
  amount: number // cents
  // The originating bet/payment (logical reference), for auditing.
  referenceId?: string | null
}

/**
 * Append-only ledger line: an immutable record of one balance movement. Never
 * edited or deleted — it is the audit source of truth. `amount` is always a
 * positive Money; the `type` carries the semantics (in/out).
 */
export class LedgerEntry extends Entity<LedgerEntry, LedgerEntryProps> {
  readonly walletId: string
  readonly type: LedgerEntryType
  readonly amount: Money
  readonly referenceId: string | null

  constructor(props: LedgerEntryProps) {
    super(props)
    this.walletId = props.walletId
    this.type = props.type
    this.amount = new Money(props.amount)
    this.referenceId = props.referenceId ?? null
  }
}
