import { UseCase } from 'shared'
import { MatchRepository } from '../providers'

interface Input {
  matchId: string
}

/**
 * System-triggered lock (the worker runs it when the scheduled time arrives) —
 * NOT admin-gated, since no user initiates it. Idempotent by design: if the
 * match is gone or no longer `open` (already locked by an admin, settled or
 * cancelled), it is a no-op. The `open → locked` invariant still lives in
 * Match.lockBetting.
 */
export default class AutoLockMatch implements UseCase<Input, void> {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute({ matchId }: Input): Promise<void> {
    const match = await this.matchRepository.findById(matchId)
    if (!match || match.status !== 'open') return

    match.lockBetting()
    await this.matchRepository.update(match)
  }
}
