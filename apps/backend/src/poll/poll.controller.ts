import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'
import {
  CreatePollInput,
  ReschedulePollInput,
  ResolvePollInput,
  PollDTO,
  PollFacade,
} from '@poll/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor, NotFoundError, Errors } from 'shared'
import { PrismaPollRepository } from './prisma-poll-repository'
import { BullMqPollCloseQueue } from './bullmq-poll-close-queue'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'
import { requireFields } from '../shared/require-fields'
import { BullMqSettlementQueue } from '../betting/bullmq-settlement-queue'
import { PrismaCategoryRepository } from '../category/prisma-category-repository'

// Protected by the AuthMiddleware (see poll.module). Reading (list/detail) is
// open to any authenticated user; opening a poll and every lifecycle transition
// (reschedule/close/resolve/cancel) are admin-only (AdminGuard at the edge +
// AdminUseCase in the domain).
@Controller('poll')
export class PollController {
  constructor(
    private readonly pollRepository: PrismaPollRepository,
    private readonly closeQueue: BullMqPollCloseQueue,
    private readonly settlementQueue: BullMqSettlementQueue,
    private readonly categoryRepository: PrismaCategoryRepository,
  ) {}

  private facade(): PollFacade {
    return new PollFacade(this.pollRepository, this.pollRepository, this.closeQueue)
  }

  private actor(user: UserDTO): AuthenticatedActor {
    return { id: user.id, role: user.role }
  }

  // Cross-context: resolve the category (must exist) and whether it is a leaf, to
  // pass as plain data to the poll use case (poll never imports the category ctx).
  private async resolveCategoryIsLeaf(categoryId: string): Promise<boolean> {
    const category = await this.categoryRepository.findByIdQuery(categoryId)
    if (!category) NotFoundError.throwError(Errors.CATEGORY_NOT_FOUND, categoryId)
    return category.isLeaf
  }

  @Get()
  list(): Promise<PollDTO[]> {
    return this.facade().listPolls()
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<PollDTO> {
    return this.facade().getPoll(id)
  }

  @Post()
  @HttpCode(201)
  @UseGuards(AdminGuard)
  async create(@Body() input: CreatePollInput, @authenticatedUser() user: UserDTO) {
    requireFields(input, ['question', 'resolutionCriteria', 'categoryId', 'closesAt', 'options'])
    const categoryIsLeaf = await this.resolveCategoryIsLeaf(input.categoryId)
    await this.facade().createPoll(input, this.actor(user), categoryIsLeaf)
  }

  // The deadline is the only editable detail (see the Poll aggregate).
  @Patch(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async reschedule(
    @Param('id') id: string,
    @Body() input: ReschedulePollInput,
    @authenticatedUser() user: UserDTO,
  ) {
    requireFields(input, ['closesAt'])
    await this.facade().reschedulePoll(id, input, this.actor(user))
  }

  // Shuts betting ahead of the deadline — the normal case when the answer shows
  // up early.
  @Post(':id/close')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async close(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().closePoll(id, this.actor(user))
  }

  @Post(':id/resolve')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  async resolve(
    @Param('id') id: string,
    @Body() input: ResolvePollInput,
    @authenticatedUser() user: UserDTO,
  ): Promise<PollDTO> {
    requireFields(input, ['winningOptionId'])
    await this.facade().resolvePoll(id, input, this.actor(user))
    const poll = await this.facade().getPoll(id)
    // Cross-context: enqueue the parimutuel payout of the bets (worker settles).
    // The winning option's id IS the winning selection — betting never learns
    // what a poll is, exactly as it never learns what a match is.
    await this.settlementQueue.enqueue({
      marketId: id,
      winningSelectionId: poll.winningOptionId,
      rakeBasisPoints: poll.rakeBasisPoints,
    })
    return poll
  }

  @Post(':id/cancel')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async cancel(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().cancelPoll(id, this.actor(user))
    // Cross-context: enqueue a refund of every open bet (worker refunds).
    await this.settlementQueue.enqueue({
      marketId: id,
      winningSelectionId: null,
      rakeBasisPoints: 0,
      cancelled: true,
    })
  }
}
