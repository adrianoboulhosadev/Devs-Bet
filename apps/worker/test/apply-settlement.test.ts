import { Wallet } from '@wallet/adapters'
import { Bet } from '@betting/adapters'
import { applyBetToWallet } from '../src/settlement/apply-settlement'

function wallet(balance: number, held: number): Wallet {
  return new Wallet({ userId: 'u1', balance, held })
}

function bet(status: 'won' | 'lost' | 'refunded', stake: number, payout = 0): Bet {
  return new Bet({ matchId: 'm1', bettorId: 'u1', participantId: 'A', stake, status, payout })
}

test('a winning bet settles the hold and credits the payout; ledger records the net', () => {
  const account = wallet(5000, 1000)
  const line = applyBetToWallet(account, bet('won', 1000, 3000))

  expect(account.held.cents).toBe(0)
  expect(account.balance.cents).toBe(7000) // 5000 - 1000 (stake to pool) + 3000 (payout)
  expect(line).toEqual({ type: 'bet_won', amount: 2000, referenceId: expect.any(String) })
})

test('a losing bet consumes the held stake', () => {
  const account = wallet(5000, 1000)
  const line = applyBetToWallet(account, bet('lost', 1000))

  expect(account.held.cents).toBe(0)
  expect(account.balance.cents).toBe(4000)
  expect(line.type).toBe('bet_lost')
  expect(line.amount).toBe(1000)
})

test('a refunded bet releases the hold, keeping the balance', () => {
  const account = wallet(5000, 1000)
  const line = applyBetToWallet(account, bet('refunded', 1000))

  expect(account.held.cents).toBe(0)
  expect(account.balance.cents).toBe(5000)
  expect(line.type).toBe('refund')
  expect(line.amount).toBe(1000)
})

test('multiple bets of one bettor apply cumulatively', () => {
  const account = wallet(10000, 3000) // three 1000-stake holds
  applyBetToWallet(account, bet('won', 1000, 2500))
  applyBetToWallet(account, bet('lost', 1000))
  applyBetToWallet(account, bet('refunded', 1000))

  // won: -1000 +2500 ; lost: -1000 ; refunded: 0  => 10000 +500 = 10500
  expect(account.balance.cents).toBe(10500)
  expect(account.held.cents).toBe(0)
})
