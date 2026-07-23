import { PaymentDirection, PaymentStatus } from './payment'

/** READ projection (CQRS) of a payment — the user's own history / the admin panel. */
export interface PaymentDTO {
  id: string
  userId: string
  direction: PaymentDirection
  amount: number
  status: PaymentStatus
  referenceCode: string
  createdAt: Date
  confirmedAt: Date | null
}
