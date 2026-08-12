import { Money, Errors, ValidationError, ConflictError } from 'shared'
import { Bet, BetWon, BetLost, BetRefunded } from '../src'

function openBet(stake = 1000): Bet {
  return new Bet({ marketId: 'm1', bettorId: 'u1', selectionId: 'A', stake })
}

test('a new bet is open with a positive stake (match market by default)', () => {
  const bet = openBet()
  expect(bet.status).toBe('open')
  expect(bet.marketType).toBe('match')
  expect(bet.stake.cents).toBe(1000)
  expect(bet.payout.cents).toBe(0)
})

test('rejects a zero stake with INVALID_STAKE', () => {
  try {
    openBet(0)
    fail('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).code).toBe(Errors.INVALID_STAKE)
  }
})

test('carries the outright market type when set', () => {
  const bet = new Bet({
    marketType: 'tournament_outright',
    marketId: 't1',
    bettorId: 'u1',
    selectionId: 'p1',
    stake: 500,
  })
  expect(bet.marketType).toBe('tournament_outright')
})

test('settleAsWinner records the payout', () => {
  const bet = openBet()
  bet.settleAsWinner(new Money(3333))
  expect(bet.status).toBe('won')
  expect(bet.payout.cents).toBe(3333)
  expect(bet.settledAt).toBeInstanceOf(Date)
})

test('settleAsLoser zeroes the payout; refund returns the stake', () => {
  const loser = openBet()
  loser.settleAsLoser()
  expect(loser.status).toBe('lost')
  expect(loser.payout.cents).toBe(0)

  const refunded = openBet(1500)
  refunded.refund()
  expect(refunded.status).toBe('refunded')
  expect(refunded.payout.cents).toBe(1500)
})

test('a settled bet cannot be settled again', () => {
  const bet = openBet()
  bet.settleAsLoser()
  expect(() => bet.refund()).toThrow(ConflictError)
})

test('each settlement transition records its own domain event', () => {
  const winner = openBet()
  winner.settleAsWinner(new Money(3333))
  expect(winner.pullDomainEvents()).toEqual([expect.any(BetWon)])

  const loser = openBet()
  loser.settleAsLoser()
  expect(loser.pullDomainEvents()).toEqual([expect.any(BetLost)])

  const refunded = openBet()
  refunded.refund()
  expect(refunded.pullDomainEvents()).toEqual([expect.any(BetRefunded)])
})

test('pullDomainEvents drains the list — a second call comes back empty', () => {
  const bet = openBet()
  bet.settleAsWinner(new Money(3333))

  expect(bet.pullDomainEvents()).toHaveLength(1)
  expect(bet.pullDomainEvents()).toHaveLength(0)
})
