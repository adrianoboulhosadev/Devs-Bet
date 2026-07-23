import {
  BettingPlacementRepository,
  BettingSettlementRepository,
  BetQueryRepository,
  Bet,
  BetDTO,
} from '../../src'

/**
 * Single in-memory store for the three betting ports. Stores the Bet ENTITIES, so
 * SettleMatch mutations (settleAsWinner/Loser/refund) are visible via the same
 * references — `applySettlement` is then a no-op here (the real adapter persists
 * + moves wallets). Wallet effects are not modeled in this fake (that is the
 * worker adapter's job).
 */
export default class BettingRepositoryInMemory
  implements BettingPlacementRepository, BettingSettlementRepository, BetQueryRepository
{
  readonly bets: Bet[] = []
  private readonly createdAt = new Map<string, Date>()

  async placeBet(bet: Bet): Promise<void> {
    this.bets.push(bet)
    this.createdAt.set(bet.id.value, new Date())
  }

  async findOpenBetsByMatch(matchId: string): Promise<Bet[]> {
    return this.bets.filter((bet) => bet.matchId === matchId && bet.status === 'open')
  }

  async applySettlement(_bets: Bet[]): Promise<void> {
    // no-op: the entities are already mutated in place (same references).
  }

  async listByMatchQuery(matchId: string): Promise<BetDTO[]> {
    return this.bets.filter((bet) => bet.matchId === matchId).map((bet) => this.toDTO(bet))
  }

  async listByBettorQuery(bettorId: string): Promise<BetDTO[]> {
    return this.bets.filter((bet) => bet.bettorId === bettorId).map((bet) => this.toDTO(bet))
  }

  private toDTO(bet: Bet): BetDTO {
    return {
      id: bet.id.value,
      matchId: bet.matchId,
      bettorId: bet.bettorId,
      participantId: bet.participantId,
      stake: bet.stake.cents,
      status: bet.status,
      payout: bet.payout.cents,
      createdAt: this.createdAt.get(bet.id.value) ?? new Date(),
      settledAt: bet.settledAt,
    }
  }
}
