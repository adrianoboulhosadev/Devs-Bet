import {
  BettingPlacementRepository,
  BettingSettlementRepository,
  BetQueryRepository,
  ComboBettingPlacementRepository,
  Bet,
  BetDTO,
  ComboBet,
  ComboBetDTO,
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
    ComboBettingPlacementRepository
{
  readonly bets: Bet[] = []
  readonly combos: ComboBet[] = []
  private readonly createdAt = new Map<string, Date>()

  async placeBet(bet: Bet): Promise<void> {
    this.bets.push(bet)
    this.createdAt.set(bet.id.value, new Date())
  }

  async placeCombo(combo: ComboBet): Promise<void> {
    this.combos.push(combo)
    this.createdAt.set(combo.id.value, new Date())
  }

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
