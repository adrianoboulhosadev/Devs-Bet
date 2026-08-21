import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from 'database'
import { BettingFacade, SettlementJob } from '@betting/adapters'
import { MatchFacade } from '@match/adapters'
import { PollFacade } from '@poll/adapters'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { PrismaBettingSettlementRepository } from './persistence/prisma-betting-settlement-repository'
import { PrismaMatchRepository } from './persistence/prisma-match-repository'
import { PrismaPollRepository } from './persistence/prisma-poll-repository'

// Queue names: MUST match the producers in apps/backend.
const SETTLEMENT_QUEUE = 'settlement'
const MATCH_LOCK_QUEUE = 'match-lock'
const POLL_CLOSE_QUEUE = 'poll-close'

interface MatchLockJob {
  matchId: string
}

interface PollCloseJob {
  pollId: string
}

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

const prisma = new PrismaClient()
const settlementRepository = new PrismaBettingSettlementRepository(prisma)
const bettingFacade = new BettingFacade(undefined, settlementRepository, undefined)
const matchRepository = new PrismaMatchRepository(prisma)
const matchFacade = new MatchFacade(matchRepository)
const pollRepository = new PrismaPollRepository(prisma)
const pollFacade = new PollFacade(pollRepository)

const settlementWorker = new Worker<SettlementJob>(
  SETTLEMENT_QUEUE,
  async (job) => {
    // Settle (or refund, when cancelled) all open bets of the market — a match's
    // winner, a tournament's champion (outright) or a poll's right answer. The
    // settlement never branches on which: it finds the open bets by marketId.
    await bettingFacade.settleMarket(job.data)
  },
  { connection },
)

settlementWorker.on('failed', (job, error) => {
  console.error(`[worker] settlement failed for market ${job?.data?.marketId}:`, error)
})

settlementWorker.on('completed', (job) => {
  console.log(`[worker] settled market ${job.data.marketId}`)
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

// Delayed job scheduled at poll creation (and whenever its deadline moves):
// auto-close betting when the poll's deadline arrives (idempotent — no-op if it
// was already closed/settled/cancelled). The ANSWER may only arrive weeks later;
// this only shuts the betting.
const pollCloseWorker = new Worker<PollCloseJob>(
  POLL_CLOSE_QUEUE,
  async (job) => {
    await pollFacade.autoClosePoll(job.data.pollId)
  },
  { connection },
)

pollCloseWorker.on('failed', (job, error) => {
  console.error(`[worker] auto-close failed for poll ${job?.data?.pollId}:`, error)
})

pollCloseWorker.on('completed', (job) => {
  console.log(`[worker] auto-closed poll ${job.data.pollId}`)
})

console.log(
  `[worker] up — consuming "${SETTLEMENT_QUEUE}", "${MATCH_LOCK_QUEUE}" and "${POLL_CLOSE_QUEUE}"`,
)
