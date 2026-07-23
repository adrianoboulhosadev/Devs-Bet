import {
  BettingPlacementRepository,
  BettingSettlementRepository,
  BetQueryRepository,
  BetDTO,
  MatchOddsDTO,
  MatchSettlementJob,
} from '@betting/core'
import {
  PlaceBetController,
  SettleMatchController,
  GetMatchOddsController,
  ListBetsByMatchController,
  ListMyBetsController,
} from '../controllers'
import { PlaceBetInput } from '../@types'

/**
 * Single entry point the apps call. Optional ports in the constructor. The
 * backend uses placeBet + the read methods (producing the settlement job to the
 * queue itself); the worker uses settleMatch off the queue.
 */
export default class BettingFacade {
  constructor(
    private readonly placementRepository?: BettingPlacementRepository,
    private readonly settlementRepository?: BettingSettlementRepository,
    private readonly betQueryRepository?: BetQueryRepository,
  ) {}

  async placeBet(
    input: PlaceBetInput,
    bettorId: string,
    matchStatus: string,
    participantIds: string[],
  ): Promise<void> {
    await new PlaceBetController(this.placementRepository!).execute(
      input,
      bettorId,
      matchStatus,
      participantIds,
    )
  }

  async settleMatch(job: MatchSettlementJob): Promise<void> {
    await new SettleMatchController(this.settlementRepository!).execute(job)
  }

  async getMatchOdds(matchId: string): Promise<MatchOddsDTO> {
    return new GetMatchOddsController(this.betQueryRepository!).execute(matchId)
  }

  async listBetsByMatch(matchId: string): Promise<BetDTO[]> {
    return new ListBetsByMatchController(this.betQueryRepository!).execute(matchId)
  }

  async listMyBets(bettorId: string): Promise<BetDTO[]> {
    return new ListMyBetsController(this.betQueryRepository!).execute(bettorId)
  }
}
