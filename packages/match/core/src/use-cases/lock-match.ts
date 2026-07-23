import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { MatchRepository } from '../providers'

interface Input {
  matchId: string
}

/** Admin closes betting on a match (open → locked). Admin-only (AdminUseCase). */
export default class LockMatch extends AdminUseCase<Input, void> {
  constructor(private readonly matchRepository: MatchRepository) {
    super()
  }

  protected async executeAsAdmin({ matchId }: Input): Promise<void> {
    const match = await this.matchRepository.findById(matchId)
    if (!match) NotFoundError.throwError(Errors.MATCH_NOT_FOUND, matchId)

    match.lockBetting()
    await this.matchRepository.update(match)
  }
}
