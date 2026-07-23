import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import {
  CreateMatchInput,
  DeclareResultInput,
  MatchDTO,
  MatchFacade,
} from '@match/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor } from 'shared'
import { PrismaMatchRepository } from './prisma-match-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'
import { BullMqMatchSettlementQueue } from '../betting/bullmq-match-settlement-queue'

// Protected by the AuthMiddleware (see match.module). Creating/reading is open to
// any authenticated user; the lifecycle transitions (lock/settle/cancel) are
// admin-only (AdminGuard at the edge + AdminUseCase in the domain).
@Controller('match')
export class MatchController {
  constructor(
    private readonly matchRepository: PrismaMatchRepository,
    private readonly settlementQueue: BullMqMatchSettlementQueue,
  ) {}

  private facade(): MatchFacade {
    return new MatchFacade(this.matchRepository, this.matchRepository)
  }

  private actor(user: UserDTO): AuthenticatedActor {
    return { id: user.id, role: user.role }
  }

  @Get()
  list(): Promise<MatchDTO[]> {
    return this.facade().listMatches()
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<MatchDTO> {
    return this.facade().getMatch(id)
  }

  @Post()
  @HttpCode(201)
  async create(@Body() input: CreateMatchInput, @authenticatedUser() user: UserDTO) {
    await this.facade().createMatch(input, user.id)
  }

  @Post(':id/lock')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async lock(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().lockMatch(id, this.actor(user))
  }

  @Post(':id/settle')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async settle(
    @Param('id') id: string,
    @Body() input: DeclareResultInput,
    @authenticatedUser() user: UserDTO,
  ) {
    await this.facade().declareResult(id, input, this.actor(user))
    // Cross-context: enqueue the parimutuel payout of the bets (worker settles).
    const match = await this.facade().getMatch(id)
    await this.settlementQueue.enqueue({
      matchId: id,
      winnerParticipantId: match.winnerParticipantId,
      rakeBasisPoints: match.rakeBasisPoints,
    })
  }

  @Post(':id/cancel')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async cancel(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().cancelMatch(id, this.actor(user))
    // Cross-context: enqueue a refund of every open bet (worker refunds).
    await this.settlementQueue.enqueue({
      matchId: id,
      winnerParticipantId: null,
      rakeBasisPoints: 0,
      cancelled: true,
    })
  }
}
