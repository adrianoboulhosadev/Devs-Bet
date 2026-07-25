import { ValidationError, Errors } from 'shared'
import { StakeLimit } from '../src'

test('rejects a zero or negative amount (INVALID_AMOUNT)', () => {
  expect(() => new StakeLimit({ bettorId: 'u1', amount: 0 })).toThrow(ValidationError)
  expect(() => new StakeLimit({ bettorId: 'u1', amount: -100 })).toThrow(
    expect.objectContaining({ code: Errors.INVALID_AMOUNT }),
  )
})

test('lowering the cap applies immediately', () => {
  const limit = new StakeLimit({ bettorId: 'u1', amount: 10_000 })
  limit.update(5_000)
  expect(limit.amount).toBe(5_000)
  expect(limit.pendingAmount).toBeNull()
})

test('raising the cap is only scheduled, behind a grace period', () => {
  const limit = new StakeLimit({ bettorId: 'u1', amount: 5_000 })
  limit.update(20_000)

  expect(limit.amount).toBe(5_000)
  expect(limit.pendingAmount).toBe(20_000)
  expect(limit.effectiveAt).not.toBeNull()
  expect(limit.effectiveAmount()).toBe(5_000)
})

test('a due scheduled increase activates on the next read/update', () => {
  const limit = new StakeLimit({
    bettorId: 'u1',
    amount: 5_000,
    pendingAmount: 20_000,
    effectiveAt: new Date(Date.now() - 1000),
  })
  expect(limit.effectiveAmount()).toBe(20_000)
  expect(limit.pendingAmount).toBeNull()
})

test('ensureWithinLimit rejects a stake that would breach the daily cap', () => {
  const limit = new StakeLimit({ bettorId: 'u1', amount: 10_000 })
  expect(() => limit.ensureWithinLimit(6_000, 5_000)).toThrow(
    expect.objectContaining({ code: Errors.STAKE_LIMIT_EXCEEDED }),
  )
})

test('ensureWithinLimit allows a stake that stays at or under the cap', () => {
  const limit = new StakeLimit({ bettorId: 'u1', amount: 10_000 })
  expect(() => limit.ensureWithinLimit(6_000, 4_000)).not.toThrow()
})
