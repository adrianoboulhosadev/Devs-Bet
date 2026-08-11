import {
  BettingPlacementRepository,
  BettingSettlementRepository,
  BetQueryRepository,
  ComboBettingPlacementRepository,
  StakeLimitRepository,
  StakeLimitQueryRepository,
  BetCancellationRepository,
  BetDTO,
  MarketOddsDTO,
  LeaderboardEntryDTO,
  ComboBetDTO,
  StakeLimitDTO,
  OddsSnapshotDTO,
  SettlementJob,
} from '@betting/core'
import {
  PlaceBetController,
  SettleMarketController,
  GetMarketOddsController,
  ListBetsByMarketController,
  ListMyBetsController,
  GetLeaderboardController,
  PlaceComboBetController,
  CancelBetController,
  ListMyComboBetsController,
  SetStakeLimitController,
  GetMyStakeLimitController,
  GetOddsHistoryController,
} from '../controllers'
import { PlaceBetInput, PlaceComboBetLegInput, SetStakeLimitInput } from '../@types'

/**
 * Single entry point the apps call. Optional ports in the constructor. The
 * backend uses placeBet/placeComboBet + the read methods (producing the
 * settlement job to the queue itself); the worker uses settleMarket off the
 * queue. Works for any market (a match or a tournament's champion).
 */
export default class BettingFacade {
  constructor(
    private readonly placementRepository?: BettingPlacementRepository,
    private readonly settlementRepository?: BettingSettlementRepository,
    private readonly betQueryRepository?: BetQueryRepository,
    private readonly comboPlacementRepository?: ComboBettingPlacementRepository,
    private readonly stakeLimitRepository?: StakeLimitRepository,
    private readonly stakeLimitQueryRepository?: StakeLimitQueryRepository,
    private readonly cancellationRepository?: BetCancellationRepository,
  ) {}

  async placeBet(
    input: PlaceBetInput,
    bettorId: string,
    marketOpen: boolean,
    selectionIds: string[],
    bettorSelfExcluded: boolean,
  ): Promise<void> {
    await new PlaceBetController(this.placementRepository!, this.stakeLimitRepository!).execute(
      input,
      bettorId,
      marketOpen,
      selectionIds,
      bettorSelfExcluded,
    )
  }

  async settleMarket(job: SettlementJob): Promise<void> {
    await new SettleMarketController(this.settlementRepository!).execute(job)
  }

  async getMarketOdds(marketId: string): Promise<MarketOddsDTO> {
    return new GetMarketOddsController(this.betQueryRepository!).execute(marketId)
  }

  async listBetsByMarket(marketId: string): Promise<BetDTO[]> {
    return new ListBetsByMarketController(this.betQueryRepository!).execute(marketId)
  }

  async listMyBets(bettorId: string): Promise<BetDTO[]> {
    return new ListMyBetsController(this.betQueryRepository!).execute(bettorId)
  }

  async getLeaderboard(limit: number): Promise<LeaderboardEntryDTO[]> {
    return new GetLeaderboardController(this.betQueryRepository!).execute(limit)
  }

  async placeComboBet(
    stake: number,
    legs: PlaceComboBetLegInput[],
    bettorId: string,
    bettorSelfExcluded: boolean,
  ): Promise<void> {
    await new PlaceComboBetController(this.comboPlacementRepository!, this.stakeLimitRepository!).execute(
      stake,
      legs,
      bettorId,
      bettorSelfExcluded,
    )
  }

  // Cancelling one's own wager while the market(s) are still open.
  async cancelBet(betId: string, bettorId: string, marketOpen: boolean): Promise<void> {
    await new CancelBetController(this.cancellationRepository!).cancelBet(betId, bettorId, marketOpen)
  }

  async cancelComboBet(comboBetId: string, bettorId: string, allMarketsOpen: boolean): Promise<void> {
    await new CancelBetController(this.cancellationRepository!).cancelCombo(
      comboBetId,
      bettorId,
      allMarketsOpen,
    )
  }

  async listMyComboBets(bettorId: string): Promise<ComboBetDTO[]> {
    return new ListMyComboBetsController(this.betQueryRepository!).execute(bettorId)
  }

  async setStakeLimit(input: SetStakeLimitInput, bettorId: string): Promise<void> {
    await new SetStakeLimitController(this.stakeLimitRepository!).execute(input, bettorId)
  }

  async getMyStakeLimit(bettorId: string): Promise<StakeLimitDTO | null> {
    return new GetMyStakeLimitController(this.stakeLimitQueryRepository!).execute(bettorId)
  }

  async getOddsHistory(marketId: string): Promise<OddsSnapshotDTO[]> {
    return new GetOddsHistoryController(this.betQueryRepository!).execute(marketId)
  }
}
