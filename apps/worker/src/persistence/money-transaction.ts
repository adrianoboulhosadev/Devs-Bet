import { Prisma, PrismaClient } from 'database'
import { ConflictError, Errors } from 'shared'

/** Prisma's code for "transaction failed due to a write conflict or a deadlock" —
 * what Postgres raises (SQLSTATE 40001) when serializable isolation refuses to
 * let two transactions interleave. It means "retry me", not "the data is bad". */
const WRITE_CONFLICT = 'P2034'

const MAX_ATTEMPTS = 8
const BASE_BACKOFF_MS = 20

/**
 * Runs a money move under SERIALIZABLE isolation, retrying on write conflicts.
 *
 * Settlement is read-modify-write on the wallet (load it, apply each bet's
 * effect, write the new balance back), and the worker can be settling one market
 * while the bettor places a bet on another. Under Postgres' default READ
 * COMMITTED both sides read the SAME balance and the later write silently
 * swallows the other's — the ledger keeps every line while the wallet loses one.
 * Serializable makes the database reject that interleaving; the retry re-reads
 * the committed balance and re-applies the effect on top of it.
 *
 * Mirrors apps/backend's helper of the same name: the two apps hold their own
 * driven adapters (the only shared infra is the PrismaClient), so the helper is
 * duplicated rather than shared through a package.
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
      if (!isWriteConflict(error)) throw error
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
