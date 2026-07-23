export interface MatchSettlementJob {
  matchId: string
  winnerParticipantId: string | null
  rakeBasisPoints: number
  // true when the match was cancelled (refund everyone) instead of settled.
  cancelled?: boolean
}

/**
 * Queue port for asynchronous settlement. The backend (producer) enqueues a job
 * when the admin declares the result / cancels a match; the worker (consumer)
 * runs SettleMatch/RefundMatch. Implemented with BullMQ; the queue name and job
 * name must match between producer and consumer.
 */
export interface MatchSettlementQueue {
  enqueue(job: MatchSettlementJob): Promise<void>
}
