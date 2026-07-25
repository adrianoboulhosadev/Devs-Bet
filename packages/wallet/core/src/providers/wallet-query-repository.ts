import { WalletDTO, SelfExclusionDTO } from '../model'

/** Wallet READ port (query side of CQRS) — returns a DTO. */
export interface WalletQueryRepository {
  findByUserIdQuery(userId: string): Promise<WalletDTO | null>
  findActiveSelfExclusionQuery(userId: string): Promise<SelfExclusionDTO | null>
}
