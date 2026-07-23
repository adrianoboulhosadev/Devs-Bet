import { Wallet } from '@wallet/adapters'
import type { LedgerEntryType } from '@wallet/adapters'
import { Bet } from '@betting/adapters'

export interface LedgerLine {
  type: LedgerEntryType
  amount: number
  referenceId: string
}

/**
 * Applies one settled bet's money effect to its bettor's wallet and returns the
 * ledger line to record. Pure (mutates the passed Wallet, no IO):
 *  - refunded → release the hold (stake back to available).
 *  - lost     → settle the hold (stake leaves the balance).
 *  - won      → settle the hold (stake to the pool) + credit the payout; the
 *               ledger records the NET (bet_won if payout ≥ stake, else bet_lost).
 */
export function applyBetToWallet(wallet: Wallet, bet: Bet): LedgerLine {
  const stake = bet.stake

  if (bet.status === 'refunded') {
    wallet.release(stake)
    return { type: 'refund', amount: stake.cents, referenceId: bet.id.value }
  }

  if (bet.status === 'lost') {
    wallet.settleHold(stake)
    return { type: 'bet_lost', amount: stake.cents, referenceId: bet.id.value }
  }

  // won
  wallet.settleHold(stake)
  wallet.credit(bet.payout)
  const net = bet.payout.cents - stake.cents
  return net >= 0
    ? { type: 'bet_won', amount: net, referenceId: bet.id.value }
    : { type: 'bet_lost', amount: -net, referenceId: bet.id.value }
}
