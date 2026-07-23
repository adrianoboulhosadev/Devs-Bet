import { PaymentDTO } from '../model'

/** Payment READ port (query side of CQRS). */
export interface PaymentQueryRepository {
  listByUserQuery(userId: string): Promise<PaymentDTO[]>
  // Admin panel: every payment still awaiting a decision.
  listPendingQuery(): Promise<PaymentDTO[]>
}
