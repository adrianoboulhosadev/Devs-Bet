import { AdminUseCase } from 'shared'
import { PaymentDTO } from '../model'
import { PaymentQueryRepository } from '../providers'

/** Admin panel read: every payment awaiting a decision. Admin-only (AdminUseCase). */
export default class ListPendingPaymentsQuery extends AdminUseCase<void, PaymentDTO[]> {
  constructor(private readonly paymentQueryRepository: PaymentQueryRepository) {
    super()
  }

  protected async executeAsAdmin(): Promise<PaymentDTO[]> {
    return this.paymentQueryRepository.listPendingQuery()
  }
}
