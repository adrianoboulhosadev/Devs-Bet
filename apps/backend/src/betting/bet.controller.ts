import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { PlaceBetInput, BetDTO, MarketOddsDTO, BettingFacade } from '@betting/adapters'
import { UserDTO } from '@auth/adapters'
import { MATCH_DRAW_SELECTION_ID } from '@match/adapters'
import { NotFoundError, Errors } from 'shared'
import { PrismaBettingPlacementRepository } from './prisma-betting-placement-repository'
import { PrismaBetQueryRepository } from './prisma-bet-query-repository'
import { PrismaMatchRepository } from '../match/prisma-match-repository'
import { PrismaTournamentRepository } from '../tournament/prisma-tournament-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'

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
  ) {}

  private facade(): BettingFacade {
    return new BettingFacade(this.placementRepository, undefined, this.betQueryRepository)
  }

  // Resolve whether the market accepts bets right now and its valid selections.
  private async resolveMarket(
    input: PlaceBetInput,
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
    // A match can also draw: bettors may back that pseudo-selection too.
    return {
      marketOpen: match.status === 'open',
      selectionIds: [...match.participants.map((p) => p.id), MATCH_DRAW_SELECTION_ID],
    }
  }

  @Post()
  @HttpCode(201)
  async place(@Body() input: PlaceBetInput, @authenticatedUser() user: UserDTO) {
    const { marketOpen, selectionIds } = await this.resolveMarket(input)
    await this.facade().placeBet(input, user.id, marketOpen, selectionIds)
  }

  @Get('mine')
  mine(@authenticatedUser() user: UserDTO): Promise<BetDTO[]> {
    return this.facade().listMyBets(user.id)
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
