import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'
import {
  CreateMatchInput,
  MatchParticipantSnapshot,
  UpdateMatchInput,
  RecordUnitResultInput,
  MatchDTO,
  MatchFacade,
  MATCH_DRAW_SELECTION_ID,
} from '@match/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor, NotFoundError, Errors } from 'shared'
import { PrismaMatchRepository } from './prisma-match-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'
import { BullMqSettlementQueue } from '../betting/bullmq-settlement-queue'
import { BullMqMatchLockQueue } from './bullmq-match-lock-queue'
import { PrismaCategoryRepository } from '../category/prisma-category-repository'
import { PrismaParticipantRepository } from '../participant/prisma-participant-repository'

// Protected by the AuthMiddleware (see match.module). Reading (list/detail) is
// open to any authenticated user; creating a match and every lifecycle
// transition (lock/settle/cancel) are admin-only (AdminGuard at the edge +
// AdminUseCase in the domain).
@Controller('match')
export class MatchController {
  constructor(
    private readonly matchRepository: PrismaMatchRepository,
    private readonly settlementQueue: BullMqSettlementQueue,
    private readonly lockQueue: BullMqMatchLockQueue,
    private readonly categoryRepository: PrismaCategoryRepository,
    private readonly participantRepository: PrismaParticipantRepository,
  ) {}

  private facade(): MatchFacade {
    return new MatchFacade(this.matchRepository, this.matchRepository, this.lockQueue)
  }

  private actor(user: UserDTO): AuthenticatedActor {
    return { id: user.id, role: user.role }
  }

  // Cross-context: resolve the category (must exist) and whether it is a leaf, to
  // pass as plain data to the match use case (match never imports the category ctx).
  private async resolveCategoryIsLeaf(categoryId: string): Promise<boolean> {
    const category = await this.categoryRepository.findByIdQuery(categoryId)
    if (!category) NotFoundError.throwError(Errors.CATEGORY_NOT_FOUND, categoryId)
    return category.isLeaf
  }

  // Cross-context: resolve each participantId against the catalog (must exist)
  // into the snapshot the match use case needs — match never imports
  // @participant/core. Preserves the order the admin picked.
  private async resolveParticipants(participantIds: string[]): Promise<MatchParticipantSnapshot[]> {
    const catalog = await this.participantRepository.findByIdsQuery(participantIds)
    return participantIds.map((participantId) => {
      const participant = catalog.find((entry) => entry.id === participantId)
      if (!participant) NotFoundError.throwError(Errors.PARTICIPANT_NOT_FOUND, participantId)
      return {
        participantId: participant.id,
        displayName: participant.name,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
      }
    })
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
    const categoryIsLeaf = await this.resolveCategoryIsLeaf(input.categoryId)
    const participants = await this.resolveParticipants(input.participantIds)
    await this.facade().createMatch(input, this.actor(user), categoryIsLeaf, participants)
  }

  @Patch(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() input: UpdateMatchInput,
    @authenticatedUser() user: UserDTO,
  ) {
    // Only resolve the category when the edit actually changes it.
    const categoryIsLeaf =
      input.categoryId !== undefined
        ? await this.resolveCategoryIsLeaf(input.categoryId)
        : undefined
    await this.facade().updateMatch(id, input, this.actor(user), categoryIsLeaf)
  }

  @Post(':id/lock')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async lock(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().lockMatch(id, this.actor(user))
  }

  // Records the winner of the match's next unit (map/leg/round/fight). A bestOf-1
  // match settles right away; a bestOf-3/5 match may need this called again for
  // the following units before it actually settles (the response reflects that).
  @Post(':id/units')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  async recordUnitResult(
    @Param('id') id: string,
    @Body() input: RecordUnitResultInput,
    @authenticatedUser() user: UserDTO,
  ): Promise<MatchDTO> {
    await this.facade().recordUnitResult(id, input, this.actor(user))
    const match = await this.facade().getMatch(id)
    if (match.status === 'settled') {
      // Cross-context: enqueue the parimutuel payout of the bets (worker settles).
      // A draw (winnerParticipantId null) settles as its own selection, so bets
      // placed on the draw are paid like any other winning selection.
      await this.settlementQueue.enqueue({
        marketId: id,
        winningSelectionId: match.winnerParticipantId ?? MATCH_DRAW_SELECTION_ID,
        rakeBasisPoints: match.rakeBasisPoints,
      })
    }
    return match
  }

  @Post(':id/cancel')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async cancel(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().cancelMatch(id, this.actor(user))
    // Cross-context: enqueue a refund of every open bet (worker refunds).
    await this.settlementQueue.enqueue({
      marketId: id,
      winningSelectionId: null,
      rakeBasisPoints: 0,
      cancelled: true,
    })
  }
}
