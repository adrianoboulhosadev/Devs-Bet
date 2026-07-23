import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from 'database'
import { BettingFacade, MatchSettlementJob } from '@betting/adapters'
import { MatchFacade } from '@match/adapters'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { PrismaBettingSettlementRepository } from './persistence/prisma-betting-settlement-repository'
import { PrismaMatchRepository } from './persistence/prisma-match-repository'

// Queue names: MUST match the producers in apps/backend.
const MATCH_SETTLEMENT_QUEUE = 'match-settlement'
const MATCH_LOCK_QUEUE = 'match-lock'

interface MatchLockJob {
  matchId: string
}

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

const prisma = new PrismaClient()
const settlementRepository = new PrismaBettingSettlementRepository(prisma)
const bettingFacade = new BettingFacade(undefined, settlementRepository, undefined)
const matchRepository = new PrismaMatchRepository(prisma)
const matchFacade = new MatchFacade(matchRepository)

const settlementWorker = new Worker<MatchSettlementJob>(
  MATCH_SETTLEMENT_QUEUE,
  async (job) => {
    // Settle (or refund, when cancelled) all open bets of the match.
    await bettingFacade.settleMatch(job.data)
  },
  { connection },
)

settlementWorker.on('failed', (job, error) => {
  console.error(`[worker] settlement failed for match ${job?.data?.matchId}:`, error)
})

settlementWorker.on('completed', (job) => {
  console.log(`[worker] settled match ${job.data.matchId}`)
})

// Delayed job scheduled at match creation: auto-lock betting when the match's
// time arrives (idempotent — no-op if it was already locked/settled/cancelled).
const lockWorker = new Worker<MatchLockJob>(
  MATCH_LOCK_QUEUE,
  async (job) => {
    await matchFacade.autoLockMatch(job.data.matchId)
  },
  { connection },
)

lockWorker.on('failed', (job, error) => {
  console.error(`[worker] auto-lock failed for match ${job?.data?.matchId}:`, error)
})

lockWorker.on('completed', (job) => {
  console.log(`[worker] auto-locked match ${job.data.matchId}`)
})

console.log(`[worker] up — consuming "${MATCH_SETTLEMENT_QUEUE}" and "${MATCH_LOCK_QUEUE}"`)
