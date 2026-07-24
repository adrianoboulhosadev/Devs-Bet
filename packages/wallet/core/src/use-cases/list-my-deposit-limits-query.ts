import { UseCase } from 'shared'
import { DepositLimitDTO } from '../model'
import { DepositLimitQueryRepository } from '../providers'

/** Read side (CQRS): the authenticated user's own deposit caps. */
export default class ListMyDepositLimitsQuery implements UseCase<string, DepositLimitDTO[]> {
  constructor(private readonly depositLimitQueryRepository: DepositLimitQueryRepository) {}

  async execute(userId: string): Promise<DepositLimitDTO[]> {
    return this.depositLimitQueryRepository.listDepositLimitsByUserQuery(userId)
  }
}
