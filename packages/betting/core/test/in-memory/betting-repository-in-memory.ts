import {
  BettingPlacementRepository,
  BettingSettlementRepository,
  BetQueryRepository,
  ComboBettingPlacementRepository,
  BetCancellationRepository,
  StakeLimitRepository,
  StakeLimitQueryRepository,
  Bet,
  BetDTO,
  ComboBet,
  ComboBetDTO,
  StakeLimit,
  StakeLimitDTO,
  OddsSnapshotDTO,
} from '../../src'

/**
 * Single in-memory store for the betting ports. Stores the Bet/ComboBet
 * ENTITIES, so SettleMarket/RefundMarket mutations (settleAsWinner/Loser/refund,
 * resolveLeg) are visible via the same references — `applySettlement`/
 * `applyComboSettlement` are then no-ops here (the real adapter persists + moves
 * wallets). Wallet effects are not modeled in this fake (that is the worker
 * adapter's job).
 */
export default class BettingRepositoryInMemory
  implements
    BettingPlacementRepository,
    BettingSettlementRepository,
    BetQueryRepository,
    ComboBettingPlacementRepository,
    BetCancellationRepository,
    StakeLimitRepository,
    StakeLimitQueryRepository
{
  readonly bets: Bet[] = []
  readonly combos: ComboBet[] = []
  readonly stakeLimits: StakeLimit[] = []
  // Odds snapshots are recorded by the real Prisma adapter's placeBet
  // transaction (a persistence side-effect, not a domain rule) — this fake
  // just holds whatever a test seeds directly, for the read side to serve.
  readonly oddsSnapshots: (OddsSnapshotDTO & { marketId: string })[] = []
  private readonly createdAt = new Map<string, Date>()

  async placeBet(bet: Bet): Promise<void> {
    this.bets.push(bet)
    this.createdAt.set(bet.id.value, new Date())
  }

  async placeCombo(combo: ComboBet): Promise<void> {
    this.combos.push(combo)
    this.createdAt.set(combo.id.value, new Date())
  }

  // Cancellation: the aggregates are held by reference, so the refund the use
  // case applied is already visible — persisting is a no-op, like settlement.
  async findBetById(betId: string): Promise<Bet | null> {
    return this.bets.find((bet) => bet.id.value === betId) ?? null
  }

  async cancelBet(_bet: Bet): Promise<void> {}

  async findComboBetById(comboBetId: string): Promise<ComboBet | null> {
    return this.combos.find((combo) => combo.id.value === comboBetId) ?? null
  }

  async cancelCombo(_combo: ComboBet): Promise<void> {}

  async findOpenBetsByMarket(marketId: string): Promise<Bet[]> {
    return this.bets.filter((bet) => bet.marketId === marketId && bet.status === 'open')
  }

  async findSettledBets(): Promise<Bet[]> {
    return this.bets.filter((bet) => bet.status !== 'open')
  }

  async applySettlement(_bets: Bet[]): Promise<void> {
    // no-op: the entities are already mutated in place (same references).
  }

  async findComboBetsWithOpenLegByMarket(marketId: string): Promise<ComboBet[]> {
    return this.combos.filter(
      (combo) =>
        combo.status === 'open' &&
        combo.legs.some((leg) => leg.marketId === marketId && leg.isPending),
    )
  }

  async applyComboSettlement(_combos: ComboBet[]): Promise<void> {
    // no-op: same reasoning as applySettlement.
  }

  async listByMarketQuery(marketId: string): Promise<BetDTO[]> {
    return this.bets.filter((bet) => bet.marketId === marketId).map((bet) => this.toDTO(bet))
  }

  async listByBettorQuery(bettorId: string): Promise<BetDTO[]> {
    return this.bets.filter((bet) => bet.bettorId === bettorId).map((bet) => this.toDTO(bet))
  }

  async listComboBetsByBettorQuery(bettorId: string): Promise<ComboBetDTO[]> {
    return this.combos.filter((combo) => combo.bettorId === bettorId).map((combo) => this.toComboDTO(combo))
  }

  async findStakeLimit(bettorId: string): Promise<StakeLimit | null> {
    return this.stakeLimits.find((limit) => limit.bettorId === bettorId) ?? null
  }

  async saveStakeLimit(limit: StakeLimit): Promise<void> {
    if (!this.stakeLimits.includes(limit)) this.stakeLimits.push(limit)
  }

  async sumStakedSince(bettorId: string, since: Date): Promise<number> {
    const placedSince = (id: string) => (this.createdAt.get(id) ?? new Date(0)).getTime() >= since.getTime()

    const betsSum = this.bets
      .filter((bet) => bet.bettorId === bettorId && placedSince(bet.id.value))
      .reduce((sum, bet) => sum + bet.stake.cents, 0)
    const combosSum = this.combos
      .filter((combo) => combo.bettorId === bettorId && placedSince(combo.id.value))
      .reduce((sum, combo) => sum + combo.stake.cents, 0)

    return betsSum + combosSum
  }

  async getMyStakeLimitQuery(bettorId: string): Promise<StakeLimitDTO | null> {
    const limit = this.stakeLimits.find((candidate) => candidate.bettorId === bettorId)
    return limit
      ? { amount: limit.effectiveAmount(), pendingAmount: limit.pendingAmount, effectiveAt: limit.effectiveAt }
      : null
  }

  async listOddsHistoryByMarket(marketId: string): Promise<OddsSnapshotDTO[]> {
    return this.oddsSnapshots
      .filter((snapshot) => snapshot.marketId === marketId)
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
      .map(({ selectionId, pool, totalPool, impliedOdd, recordedAt }) => ({
        selectionId,
        pool,
        totalPool,
        impliedOdd,
        recordedAt,
      }))
  }

  private toDTO(bet: Bet): BetDTO {
    return {
      id: bet.id.value,
      marketType: bet.marketType,
      marketId: bet.marketId,
      bettorId: bet.bettorId,
      selectionId: bet.selectionId,
      stake: bet.stake.cents,
      status: bet.status,
      payout: bet.payout.cents,
      createdAt: this.createdAt.get(bet.id.value) ?? new Date(),
      settledAt: bet.settledAt,
    }
  }

  private toComboDTO(combo: ComboBet): ComboBetDTO {
    return {
      id: combo.id.value,
      bettorId: combo.bettorId,
      legs: combo.legs.map((leg) => ({
        marketType: leg.marketType,
        marketId: leg.marketId,
        selectionId: leg.selectionId,
        odd: leg.odd,
        result: leg.result,
      })),
      stake: combo.stake.cents,
      totalOdd: combo.totalOdd,
      status: combo.status,
      payout: combo.payout.cents,
      createdAt: this.createdAt.get(combo.id.value) ?? new Date(),
      settledAt: combo.settledAt,
    }
  }
}
