import { SettleMatch, RefundMatch, BettingSettlementRepository } from '@betting/core'

/**
 * Runs the settlement (worker side). Refunds everyone when the match was
 * cancelled; otherwise pays out the parimutuel result.
 */
export default class SettleMatchController {
  constructor(private readonly settlementRepository: BettingSettlementRepository) {}

  async execute(job: {
    matchId: string
    winnerParticipantId: string | null
    rakeBasisPoints: number
    cancelled?: boolean
  }): Promise<void> {
    if (job.cancelled) {
      await new RefundMatch(this.settlementRepository).execute({ matchId: job.matchId })
      return
    }
    await new SettleMatch(this.settlementRepository).execute({
      matchId: job.matchId,
      winnerParticipantId: job.winnerParticipantId,
      rakeBasisPoints: job.rakeBasisPoints,
    })
  }
}
