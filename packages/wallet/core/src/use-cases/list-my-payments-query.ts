import { UseCase } from 'shared'
import { PaymentDTO } from '../model'
import { PaymentQueryRepository } from '../providers'

/** Read side (CQRS): the authenticated user's payment history (deposits/withdrawals). */
export default class ListMyPaymentsQuery implements UseCase<string, PaymentDTO[]> {
  constructor(private readonly paymentQueryRepository: PaymentQueryRepository) {}

  async execute(userId: string): Promise<PaymentDTO[]> {
    return this.paymentQueryRepository.listByUserQuery(userId)
  }
}
