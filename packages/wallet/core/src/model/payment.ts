import { AggregateRoot, EntityProps, Money, ConflictError, ValidationError, Errors } from 'shared'
import { DepositConfirmed, WithdrawalPaid, PaymentRejected } from './events'

export type PaymentDirection = 'deposit' | 'withdrawal'
// deposit: pending -> confirmed | rejected. withdrawal: pending -> paid | rejected.
export type PaymentStatus = 'pending' | 'confirmed' | 'paid' | 'rejected'

export interface PaymentProps extends EntityProps {
  userId: string
  direction: PaymentDirection
  amount: number // cents
  status?: PaymentStatus
  referenceCode: string
  receiptUrl?: string | null
  rejectionReason?: string | null
  confirmedBy?: string | null
  confirmedAt?: Date | null
}

/**
 * Money in transit through the owner's bank account (manual Pix model). Its
 * lifecycle is a small state machine guarded by the entity: a settlement/reject
 * is only valid from `pending`, otherwise PAYMENT_ALREADY_SETTLED. The admin who
 * acts is stamped on `confirmedBy`. A deposit is only real once the user attaches
 * proof of the Pix (`receiptUrl`) — a withdrawal never has one (nothing to prove).
 */
export class Payment extends AggregateRoot<Payment, PaymentProps> {
  readonly userId: string
  readonly direction: PaymentDirection
  readonly amount: Money
  readonly referenceCode: string
  // Proof of the money move: the user's Pix receipt for a deposit (required at
  // creation), or the admin's payout receipt for a withdrawal (attached later,
  // at markPaid — see below). Either way, the same field the extract shows a
  // "ver comprovante" link for.
  receiptUrl: string | null
  rejectionReason: string | null
  status: PaymentStatus
  confirmedBy: string | null
  confirmedAt: Date | null

  constructor(props: PaymentProps) {
    super(props)
    this.userId = props.userId
    this.direction = props.direction
    this.amount = new Money(props.amount)
    this.referenceCode = props.referenceCode
    this.receiptUrl = props.receiptUrl ?? null
    this.rejectionReason = props.rejectionReason ?? null
    this.status = props.status ?? 'pending'
    this.confirmedBy = props.confirmedBy ?? null
    this.confirmedAt = props.confirmedAt ?? null

    if (this.direction === 'deposit' && !this.receiptUrl) {
      ValidationError.throwError(Errors.RECEIPT_REQUIRED, this.receiptUrl)
    }
  }

  private ensurePending(): void {
    if (this.status !== 'pending') {
      ConflictError.throwError(Errors.PAYMENT_ALREADY_SETTLED, this.status)
    }
  }

  /** Deposit received and credited. */
  confirm(adminId: string): void {
    this.ensurePending()
    this.status = 'confirmed'
    this.stamp(adminId)
    this.record(new DepositConfirmed(this.id.value, this.userId, this.amount.cents))
  }

  /**
   * Withdrawal effectively paid out by the admin. The payout receipt is
   * mandatory — the same "proof of the money move" `receiptUrl` a deposit
   * already requires, just attached at the other end of the withdrawal's
   * lifecycle (the admin has nothing to prove until the money actually left).
   */
  markPaid(adminId: string, receiptUrl: string): void {
    this.ensurePending()
    const trimmedReceiptUrl = receiptUrl?.trim()
    if (!trimmedReceiptUrl) ValidationError.throwError(Errors.RECEIPT_REQUIRED, receiptUrl)
    this.receiptUrl = trimmedReceiptUrl
    this.status = 'paid'
    this.stamp(adminId)
    this.record(new WithdrawalPaid(this.id.value, this.userId, this.amount.cents))
  }

  /**
   * Request denied (deposit not received / withdrawal refused). A withdrawal
   * rejection must explain itself — the bettor is told why (and it is their
   * own money staying put, not a stranger's Pix that just did not show up)
   * — a deposit rejection keeps the looser, optional reason it always had.
   */
  reject(adminId: string, reason?: string): void {
    this.ensurePending()
    const trimmedReason = reason?.trim() || null
    if (this.direction === 'withdrawal' && !trimmedReason) {
      ValidationError.throwError(Errors.REJECTION_REASON_REQUIRED, reason)
    }
    this.rejectionReason = trimmedReason
    this.status = 'rejected'
    this.stamp(adminId)
    this.record(
      new PaymentRejected(this.id.value, this.userId, this.amount.cents, this.direction, this.rejectionReason),
    )
  }

  private stamp(adminId: string): void {
    this.confirmedBy = adminId
    this.confirmedAt = new Date()
  }
}
