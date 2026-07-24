import {
  BettingPlacementRepository,
  BettingSettlementRepository,
  BetQueryRepository,
  ComboBettingPlacementRepository,
  BetDTO,
  MarketOddsDTO,
  LeaderboardEntryDTO,
  ComboBetDTO,
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
  ListMyComboBetsController,
} from '../controllers'
import { PlaceBetInput, PlaceComboBetLegInput } from '../@types'

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
  ) {}

  async placeBet(
    input: PlaceBetInput,
    bettorId: string,
    marketOpen: boolean,
    selectionIds: string[],
  ): Promise<void> {
    await new PlaceBetController(this.placementRepository!).execute(
      input,
      bettorId,
      marketOpen,
      selectionIds,
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

  async placeComboBet(stake: number, legs: PlaceComboBetLegInput[], bettorId: string): Promise<void> {
    await new PlaceComboBetController(this.comboPlacementRepository!).execute(stake, legs, bettorId)
  }

  async listMyComboBets(bettorId: string): Promise<ComboBetDTO[]> {
    return new ListMyComboBetsController(this.betQueryRepository!).execute(bettorId)
  }
}
