import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common'
import {
  PlaceBetInput,
  PlaceComboBetInput,
  PlaceComboBetLegInput,
  SetStakeLimitInput,
  BetDTO,
  ComboBetDTO,
  MarketOddsDTO,
  LeaderboardEntryDTO,
  StakeLimitDTO,
  BetMarketType,
  BettingFacade,
} from '@betting/adapters'
import { UserDTO } from '@auth/adapters'
import { MATCH_DRAW_SELECTION_ID } from '@match/adapters'
import { NotFoundError, Errors } from 'shared'
import { PrismaBettingPlacementRepository } from './prisma-betting-placement-repository'
import { PrismaBetQueryRepository } from './prisma-bet-query-repository'
import { PrismaMatchRepository } from '../match/prisma-match-repository'
import { PrismaTournamentRepository } from '../tournament/prisma-tournament-repository'
import { PrismaWalletRepository } from '../wallet/prisma-wallet-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'

// A combo leg's fixed odd, when nobody has backed that selection yet (so there
// is no pool to derive an indicative odd from) — a neutral "evens" starting
// price, just so a freshly-created market isn't uncomboable.
const DEFAULT_COMBO_ODD = 2

// Protected by the AuthMiddleware (see betting.module). bettorId always comes from
// the token. Placing a bet is cross-context: the owning market (a match or a
// tournament's champion) is resolved here — openness + valid selections — and
// passed to the betting facade as plain data (betting imports neither context).
@Controller('bet')
export class BetController {
  constructor(
    private readonly placementRepository: PrismaBettingPlacementRepository,
    private readonly betQueryRepository: PrismaBetQueryRepository,
    private readonly matchRepository: PrismaMatchRepository,
    private readonly tournamentRepository: PrismaTournamentRepository,
    private readonly walletRepository: PrismaWalletRepository,
  ) {}

  private facade(): BettingFacade {
    return new BettingFacade(
      this.placementRepository,
      undefined,
      this.betQueryRepository,
      this.placementRepository,
      this.placementRepository,
      this.betQueryRepository,
    )
  }

  // Responsible gambling: resolved from the wallet context (cross-context —
  // betting does not import wallet's core/domain, just reads this one fact).
  private async isSelfExcluded(userId: string): Promise<boolean> {
    const exclusion = await this.walletRepository.findActiveSelfExclusion(userId)
    return !!exclusion?.isActive
  }

  // Resolve whether the market accepts bets right now and its valid selections.
  private async resolveMarket(
    input: { marketType: BetMarketType; marketId: string },
  ): Promise<{ marketOpen: boolean; selectionIds: string[] }> {
    if (input.marketType === 'tournament_outright') {
      const tournament = await this.tournamentRepository.findByIdQuery(input.marketId)
      if (!tournament) NotFoundError.throwError(Errors.TOURNAMENT_NOT_FOUND, input.marketId)
      // Outright is open only BEFORE the tournament starts (locks at scheduledAt).
      const open =
        tournament.status === 'in_progress' &&
        new Date(tournament.scheduledAt).getTime() > Date.now()
      return { marketOpen: open, selectionIds: tournament.participants.map((p) => p.id) }
    }

    const match = await this.matchRepository.findByIdQuery(input.marketId)
    if (!match) NotFoundError.throwError(Errors.MATCH_NOT_FOUND, input.marketId)
    // A match that allows a draw also lets bettors back that pseudo-selection
    // (a tournament confrontation is created with allowsDraw false, since it
    // must always produce a real winner to advance the bracket).
    const selectionIds = match.participants.map((p) => p.id)
    if (match.allowsDraw) selectionIds.push(MATCH_DRAW_SELECTION_ID)
    return { marketOpen: match.status === 'open', selectionIds }
  }

  // A combo leg's fixed odd is the market's current indicative price (the same
  // live odds shown on the match/tournament page), locked in at this moment.
  private async resolveLegOdd(marketId: string, selectionId: string): Promise<number> {
    const odds = await this.facade().getMarketOdds(marketId)
    const entry = odds.entries.find((candidate) => candidate.selectionId === selectionId)
    return entry?.impliedOdd || DEFAULT_COMBO_ODD
  }

  @Post()
  @HttpCode(201)
  async place(@Body() input: PlaceBetInput, @authenticatedUser() user: UserDTO) {
    const [{ marketOpen, selectionIds }, bettorSelfExcluded] = await Promise.all([
      this.resolveMarket(input),
      this.isSelfExcluded(user.id),
    ])
    await this.facade().placeBet(input, user.id, marketOpen, selectionIds, bettorSelfExcluded)
  }

  @Post('combo')
  @HttpCode(201)
  async placeCombo(@Body() input: PlaceComboBetInput, @authenticatedUser() user: UserDTO) {
    const [legs, bettorSelfExcluded] = await Promise.all([
      Promise.all(
        input.legs.map(async (leg) => {
          const { marketOpen, selectionIds } = await this.resolveMarket(leg)
          const odd = await this.resolveLegOdd(leg.marketId, leg.selectionId)
          return { ...leg, marketOpen, selectionIds, odd }
        }),
      ),
      this.isSelfExcluded(user.id),
    ])
    await this.facade().placeComboBet(input.stake, legs, user.id, bettorSelfExcluded)
  }

  @Get('mine')
  mine(@authenticatedUser() user: UserDTO): Promise<BetDTO[]> {
    return this.facade().listMyBets(user.id)
  }

  @Get('combo/mine')
  myCombos(@authenticatedUser() user: UserDTO): Promise<ComboBetDTO[]> {
    return this.facade().listMyComboBets(user.id)
  }

  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string): Promise<LeaderboardEntryDTO[]> {
    const parsed = Number(limit)
    return this.facade().getLeaderboard(Number.isInteger(parsed) && parsed > 0 ? parsed : 10)
  }

  @Get('stake-limit')
  stakeLimit(@authenticatedUser() user: UserDTO): Promise<StakeLimitDTO | null> {
    return this.facade().getMyStakeLimit(user.id)
  }

  @Post('stake-limit')
  @HttpCode(201)
  async setStakeLimit(@Body() input: SetStakeLimitInput, @authenticatedUser() user: UserDTO) {
    await this.facade().setStakeLimit(input, user.id)
  }

  @Get('match/:id')
  matchBook(@Param('id') id: string): Promise<BetDTO[]> {
    return this.facade().listBetsByMarket(id)
  }

  @Get('match/:id/odds')
  matchOdds(@Param('id') id: string): Promise<MarketOddsDTO> {
    return this.facade().getMarketOdds(id)
  }

  @Get('tournament/:id')
  tournamentBook(@Param('id') id: string): Promise<BetDTO[]> {
    return this.facade().listBetsByMarket(id)
  }

  @Get('tournament/:id/odds')
  tournamentOdds(@Param('id') id: string): Promise<MarketOddsDTO> {
    return this.facade().getMarketOdds(id)
  }
}
