import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from 'database'
import { BettingFacade, MatchSettlementJob } from '@betting/adapters'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { PrismaBettingSettlementRepository } from './persistence/prisma-betting-settlement-repository'

// Queue name: MUST match the producer in apps/backend.
const MATCH_SETTLEMENT_QUEUE = 'match-settlement'

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

const prisma = new PrismaClient()
const settlementRepository = new PrismaBettingSettlementRepository(prisma)
const bettingFacade = new BettingFacade(undefined, settlementRepository, undefined)

const worker = new Worker<MatchSettlementJob>(
  MATCH_SETTLEMENT_QUEUE,
  async (job) => {
    // Settle (or refund, when cancelled) all open bets of the match.
    await bettingFacade.settleMatch(job.data)
  },
  { connection },
)

worker.on('failed', (job, error) => {
  console.error(`[worker] settlement failed for match ${job?.data?.matchId}:`, error)
})

worker.on('completed', (job) => {
  console.log(`[worker] settled match ${job.data.matchId}`)
})

console.log(`[worker] up — consuming "${MATCH_SETTLEMENT_QUEUE}"`)
