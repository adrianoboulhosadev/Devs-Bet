import { AutoLockMatch, MatchRepository } from '@match/core'

/** System path (worker): runs the non-admin, idempotent scheduled lock. */
export default class AutoLockMatchController {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(matchId: string): Promise<void> {
    const useCase = new AutoLockMatch(this.matchRepository)
    await useCase.execute({ matchId })
  }
}
