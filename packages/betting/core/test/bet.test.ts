import { Money, Errors, ValidationError, ConflictError } from 'shared'
import { Bet } from '../src'

function openBet(stake = 1000): Bet {
  return new Bet({ matchId: 'm1', bettorId: 'u1', participantId: 'A', stake })
}

test('a new bet is open with a positive stake', () => {
  const bet = openBet()
  expect(bet.status).toBe('open')
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
