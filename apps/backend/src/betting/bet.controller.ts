import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { PlaceBetInput, BetDTO, MatchOddsDTO, BettingFacade } from '@betting/adapters'
import { UserDTO } from '@auth/adapters'
import { NotFoundError, Errors } from 'shared'
import { PrismaBettingPlacementRepository } from './prisma-betting-placement-repository'
import { PrismaBetQueryRepository } from './prisma-bet-query-repository'
import { PrismaMatchRepository } from '../match/prisma-match-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'

// Protected by the AuthMiddleware (see betting.module). bettorId always comes from
// the token. Placing a bet is cross-context: the match is resolved here (status +
// participants) and passed to the betting facade.
@Controller('bet')
export class BetController {
  constructor(
    private readonly placementRepository: PrismaBettingPlacementRepository,
    private readonly betQueryRepository: PrismaBetQueryRepository,
    private readonly matchRepository: PrismaMatchRepository,
  ) {}

  private facade(): BettingFacade {
    return new BettingFacade(this.placementRepository, undefined, this.betQueryRepository)
  }

  @Post()
  @HttpCode(201)
  async place(@Body() input: PlaceBetInput, @authenticatedUser() user: UserDTO) {
    const match = await this.matchRepository.findByIdQuery(input.matchId)
    if (!match) NotFoundError.throwError(Errors.MATCH_NOT_FOUND, input.matchId)

    const participantIds = match.participants.map((participant) => participant.id)
    await this.facade().placeBet(input, user.id, match.status, participantIds)
  }

  @Get('mine')
  mine(@authenticatedUser() user: UserDTO): Promise<BetDTO[]> {
    return this.facade().listMyBets(user.id)
  }

  @Get('match/:id')
  book(@Param('id') id: string): Promise<BetDTO[]> {
    return this.facade().listBetsByMatch(id)
  }

  @Get('match/:id/odds')
  odds(@Param('id') id: string): Promise<MatchOddsDTO> {
    return this.facade().getMatchOdds(id)
  }
}
