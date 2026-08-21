import { AdminUseCase, AuthenticatedActor, ValidationError, Errors } from 'shared'
import { Poll } from '../model'
import { PollRepository, PollCloseQueue } from '../providers'

interface OptionInput {
  label: string
}

interface Input {
  question: string
  resolutionCriteria: string
  categoryId: string
  // Resolved from the category context by the caller (backend) — kept as plain
  // data so poll does not import the category context. The category must exist
  // (checked by the caller) and be a leaf (checked here).
  categoryIsLeaf: boolean
  imageUrl?: string | null
  closesAt: Date
  rakeBasisPoints?: number
  options: OptionInput[]
}

/**
 * Admin opens a poll. Every rule (question and criteria required and bounded,
 * category leaf, deadline in the future, two to ten distinct options) is
 * enforced here / in the Poll constructor — the use case builds the aggregate
 * (creator = the admin actor), persists it and schedules the automatic betting
 * close for `closesAt`. Admin-only (AdminUseCase), same as creating a match.
 *
 * A yes/no poll is NOT a separate kind: it is a poll with two options. The front
 * offers a shortcut that pre-fills them, and the domain never branches.
 */
export default class CreatePoll extends AdminUseCase<Input, void> {
  constructor(
    private readonly pollRepository: PollRepository,
    private readonly closeQueue?: PollCloseQueue,
  ) {
    super()
  }

  protected async executeAsAdmin(input: Input, actor: AuthenticatedActor): Promise<void> {
    if (!input.categoryIsLeaf) {
      ValidationError.throwError(Errors.CATEGORY_NOT_LEAF, input.categoryId)
    }

    const poll = new Poll({
      creatorId: actor.id,
      question: input.question,
      resolutionCriteria: input.resolutionCriteria,
      categoryId: input.categoryId,
      imageUrl: input.imageUrl,
      closesAt: input.closesAt,
      rakeBasisPoints: input.rakeBasisPoints,
      options: input.options,
    })

    await this.pollRepository.create(poll)
    await this.closeQueue?.scheduleClose({ pollId: poll.id.value, at: poll.closesAt })
  }
}
