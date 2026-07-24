export interface SettlementJob {
  // The market to settle: a match id or a tournament id.
  marketId: string
  // The winning selection (match participant / tournament champion), or null.
  winningSelectionId: string | null
  rakeBasisPoints: number
  // true when the market was cancelled (refund everyone) instead of settled.
  cancelled?: boolean
}

/**
 * Queue port for asynchronous settlement. The backend (producer) enqueues a job
 * when the admin declares a result / cancels (a match, or a tournament's champion);
 * the worker (consumer) runs SettleMarket/RefundMarket. Implemented with BullMQ;
 * the queue name and job name must match between producer and consumer.
 */
export interface SettlementQueue {
  enqueue(job: SettlementJob): Promise<void>
}
