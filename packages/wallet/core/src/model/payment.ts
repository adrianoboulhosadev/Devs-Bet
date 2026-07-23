import { Entity, EntityProps, Money, ConflictError, Errors } from 'shared'

export type PaymentDirection = 'deposit' | 'withdrawal'
// deposit: pending -> confirmed | rejected. withdrawal: pending -> paid | rejected.
export type PaymentStatus = 'pending' | 'confirmed' | 'paid' | 'rejected'

export interface PaymentProps extends EntityProps {
  userId: string
  direction: PaymentDirection
  amount: number // cents
  status?: PaymentStatus
  referenceCode: string
  confirmedBy?: string | null
  confirmedAt?: Date | null
}

/**
 * Money in transit through the owner's bank account (manual Pix model). Its
 * lifecycle is a small state machine guarded by the entity: a settlement/reject
 * is only valid from `pending`, otherwise PAYMENT_ALREADY_SETTLED. The admin who
 * acts is stamped on `confirmedBy`.
 */
export class Payment extends Entity<Payment, PaymentProps> {
  readonly userId: string
  readonly direction: PaymentDirection
  readonly amount: Money
  readonly referenceCode: string
  status: PaymentStatus
  confirmedBy: string | null
  confirmedAt: Date | null

  constructor(props: PaymentProps) {
    super(props)
    this.userId = props.userId
    this.direction = props.direction
    this.amount = new Money(props.amount)
    this.referenceCode = props.referenceCode
    this.status = props.status ?? 'pending'
    this.confirmedBy = props.confirmedBy ?? null
    this.confirmedAt = props.confirmedAt ?? null
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
  }

  /** Withdrawal effectively paid out by the admin. */
  markPaid(adminId: string): void {
    this.ensurePending()
    this.status = 'paid'
    this.stamp(adminId)
  }

  /** Request denied (deposit not received / withdrawal refused). */
  reject(adminId: string): void {
    this.ensurePending()
    this.status = 'rejected'
    this.stamp(adminId)
  }

  private stamp(adminId: string): void {
    this.confirmedBy = adminId
    this.confirmedAt = new Date()
  }
}
