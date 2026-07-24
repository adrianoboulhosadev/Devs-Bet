import { Wallet } from '@wallet/adapters'
import { Bet, ComboBet } from '@betting/adapters'
import { applyBetToWallet, applyComboToWallet } from '../src/settlement/apply-settlement'

function wallet(balance: number, held: number): Wallet {
  return new Wallet({ userId: 'u1', balance, held })
}

function bet(status: 'won' | 'lost' | 'refunded', stake: number, payout = 0): Bet {
  return new Bet({ marketId: 'm1', bettorId: 'u1', selectionId: 'A', stake, status, payout })
}

function combo(status: 'open' | 'won' | 'lost' | 'refunded', stake: number, payout = 0): ComboBet {
  return new ComboBet({
    bettorId: 'u1',
    stake,
    status,
    payout,
    legs: [
      { marketId: 'm1', selectionId: 'A', odd: 1.5 },
      { marketId: 'm2', selectionId: 'X', odd: 2 },
    ],
  })
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

test('a combo ticket still open (a leg resolved, others pending) moves no money', () => {
  const account = wallet(5000, 1000)
  const line = applyComboToWallet(account, combo('open', 1000))

  expect(line).toBeNull()
  expect(account.balance.cents).toBe(5000)
  expect(account.held.cents).toBe(1000)
})

test('a won combo settles the hold and credits the fixed payout', () => {
  const account = wallet(5000, 1000)
  const line = applyComboToWallet(account, combo('won', 1000, 3000))

  expect(account.held.cents).toBe(0)
  expect(account.balance.cents).toBe(7000)
  expect(line).toEqual({ type: 'bet_won', amount: 2000, referenceId: expect.any(String) })
})

test('a lost combo consumes the held stake', () => {
  const account = wallet(5000, 1000)
  const line = applyComboToWallet(account, combo('lost', 1000))

  expect(account.held.cents).toBe(0)
  expect(account.balance.cents).toBe(4000)
  expect(line?.type).toBe('bet_lost')
  expect(line?.amount).toBe(1000)
})

test('a refunded combo releases the hold, keeping the balance', () => {
  const account = wallet(5000, 1000)
  const line = applyComboToWallet(account, combo('refunded', 1000))

  expect(account.held.cents).toBe(0)
  expect(account.balance.cents).toBe(5000)
  expect(line?.type).toBe('refund')
  expect(line?.amount).toBe(1000)
})
