import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'
import {
  CreateMatchInput,
  UpdateMatchInput,
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
import { BullMqMatchLockQueue } from './bullmq-match-lock-queue'

// Protected by the AuthMiddleware (see match.module). Reading (list/detail) is
// open to any authenticated user; creating a match and every lifecycle
// transition (lock/settle/cancel) are admin-only (AdminGuard at the edge +
// AdminUseCase in the domain).
@Controller('match')
export class MatchController {
  constructor(
    private readonly matchRepository: PrismaMatchRepository,
    private readonly settlementQueue: BullMqMatchSettlementQueue,
    private readonly lockQueue: BullMqMatchLockQueue,
  ) {}

  private facade(): MatchFacade {
    return new MatchFacade(this.matchRepository, this.matchRepository, this.lockQueue)
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
  @UseGuards(AdminGuard)
  async create(@Body() input: CreateMatchInput, @authenticatedUser() user: UserDTO) {
    await this.facade().createMatch(input, this.actor(user))
  }

  @Patch(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() input: UpdateMatchInput,
    @authenticatedUser() user: UserDTO,
  ) {
    await this.facade().updateMatch(id, input, this.actor(user))
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
