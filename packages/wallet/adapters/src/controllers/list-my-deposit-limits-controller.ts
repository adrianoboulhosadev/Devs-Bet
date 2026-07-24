import { ListMyDepositLimitsQuery, DepositLimitQueryRepository, DepositLimitDTO } from '@wallet/core'

export default class ListMyDepositLimitsController {
  constructor(private readonly depositLimitQueryRepository: DepositLimitQueryRepository) {}

  async execute(userId: string): Promise<DepositLimitDTO[]> {
    return new ListMyDepositLimitsQuery(this.depositLimitQueryRepository).execute(userId)
  }
}
