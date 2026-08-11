import { Prisma, PrismaClient } from 'database'
import { ConflictError, Errors } from 'shared'

/** Prisma's code for "transaction failed due to a write conflict or a deadlock" —
 * what Postgres raises (SQLSTATE 40001) when serializable isolation refuses to
 * let two transactions interleave. It means "retry me", not "the data is bad". */
const WRITE_CONFLICT = 'P2034'

const MAX_ATTEMPTS = 8
const BASE_BACKOFF_MS = 20

/**
 * Runs a money move under SERIALIZABLE isolation, retrying when the database
 * refuses an unsafe interleaving.
 *
 * Every wallet transition here is read-modify-write: load the Wallet, let the
 * entity apply its rule (hold/release/credit, which is where INSUFFICIENT_BALANCE
 * comes from), write the new balance back. Under Postgres' default READ
 * COMMITTED two concurrent bets both read the SAME balance and the second write
 * silently swallows the first hold — the ledger keeps both lines while the
 * wallet counts one, so `available` is overstated and the bettor can commit
 * money they do not have.
 *
 * Serializable makes the database reject that interleaving instead of losing it;
 * the retry then re-reads the already-committed balance and re-applies the rule
 * on top of it (so a bet that no longer fits correctly raises
 * INSUFFICIENT_BALANCE). Domain invariants stay in the entity — this only
 * guarantees the entity is deciding on fresh data.
 */
export async function inMoneyTransaction<T>(
  prisma: PrismaClient,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let lastConflict: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (!isWriteConflict(error)) throw error // a domain error must surface as-is
      lastConflict = error
      // Exponential backoff WITH JITTER: without it the losers of a conflict
      // all wake up together and collide again.
      await sleep(BASE_BACKOFF_MS * 2 ** attempt * (0.5 + Math.random()))
    }
  }

  // Out of retries: the money never moved, so answer with a typed, retryable
  // error (409) instead of leaking the driver's conflict as a 500.
  ConflictError.throwError(Errors.WALLET_BUSY)
  throw lastConflict // unreachable: throwError always throws
}

function isWriteConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === WRITE_CONFLICT
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
