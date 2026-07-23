import { ListMyPaymentsQuery, PaymentQueryRepository, PaymentDTO } from '@wallet/core'

export default class ListMyPaymentsController {
  constructor(private readonly paymentQueryRepository: PaymentQueryRepository) {}

  async execute(userId: string): Promise<PaymentDTO[]> {
    const useCase = new ListMyPaymentsQuery(this.paymentQueryRepository)
    return useCase.execute(userId)
  }
}
