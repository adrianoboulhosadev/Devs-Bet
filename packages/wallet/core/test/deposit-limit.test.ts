import { ValidationError, Errors } from 'shared'
import { DepositLimit } from '../src'

test('rejects a zero or negative amount (INVALID_AMOUNT)', () => {
  expect(() => new DepositLimit({ userId: 'u1', period: 'daily', amount: 0 })).toThrow(ValidationError)
  expect(() => new DepositLimit({ userId: 'u1', period: 'daily', amount: -100 })).toThrow(
    expect.objectContaining({ code: Errors.INVALID_AMOUNT }),
  )
})

test('lowering the cap applies immediately', () => {
  const limit = new DepositLimit({ userId: 'u1', period: 'daily', amount: 10_000 })
  limit.update(5_000)
  expect(limit.amount).toBe(5_000)
  expect(limit.pendingAmount).toBeNull()
  expect(limit.effectiveAt).toBeNull()
})

test('raising the cap is only scheduled, behind a grace period', () => {
  const limit = new DepositLimit({ userId: 'u1', period: 'daily', amount: 5_000 })
  const before = Date.now()
  limit.update(20_000)

  expect(limit.amount).toBe(5_000) // unchanged for now
  expect(limit.pendingAmount).toBe(20_000)
  expect(limit.effectiveAt).not.toBeNull()
  expect(limit.effectiveAt!.getTime()).toBeGreaterThan(before)
  expect(limit.effectiveAmount()).toBe(5_000) // still the old (lower) cap
})

test('a due scheduled increase activates on the next read/update', () => {
  const limit = new DepositLimit({
    userId: 'u1',
    period: 'daily',
    amount: 5_000,
    pendingAmount: 20_000,
    effectiveAt: new Date(Date.now() - 1000), // already due
  })

  expect(limit.effectiveAmount()).toBe(20_000)
  expect(limit.pendingAmount).toBeNull()
  expect(limit.effectiveAt).toBeNull()
})

test('a further decrease while an increase is still pending cancels the schedule', () => {
  const limit = new DepositLimit({ userId: 'u1', period: 'daily', amount: 5_000 })
  limit.update(20_000) // scheduled
  limit.update(3_000) // changes its mind before the raise ever took effect

  expect(limit.amount).toBe(3_000)
  expect(limit.pendingAmount).toBeNull()
  expect(limit.effectiveAt).toBeNull()
})

test('ensureWithinLimit rejects a deposit that would breach the cap', () => {
  const limit = new DepositLimit({ userId: 'u1', period: 'daily', amount: 10_000 })
  expect(() => limit.ensureWithinLimit(6_000, 5_000)).toThrow(
    expect.objectContaining({ code: Errors.DEPOSIT_LIMIT_EXCEEDED }),
  )
})

test('ensureWithinLimit allows a deposit that stays at or under the cap', () => {
  const limit = new DepositLimit({ userId: 'u1', period: 'daily', amount: 10_000 })
  expect(() => limit.ensureWithinLimit(6_000, 4_000)).not.toThrow()
})
