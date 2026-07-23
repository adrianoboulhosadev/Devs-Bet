import { ListPendingPaymentsQuery, PaymentQueryRepository, PaymentDTO } from '@wallet/core'
import { AuthenticatedActor } from 'shared'

export default class ListPendingPaymentsController {
  constructor(private readonly paymentQueryRepository: PaymentQueryRepository) {}

  async execute(actor: AuthenticatedActor): Promise<PaymentDTO[]> {
    const useCase = new ListPendingPaymentsQuery(this.paymentQueryRepository)
    return useCase.execute(undefined, actor)
  }
}
