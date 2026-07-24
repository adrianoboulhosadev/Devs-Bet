import { DepositLimitDTO } from '../model'

/** Deposit limit READ port (query side of CQRS). */
export interface DepositLimitQueryRepository {
  listDepositLimitsByUserQuery(userId: string): Promise<DepositLimitDTO[]>
}
