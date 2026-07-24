import { ValidationError, Errors } from 'shared'
import { ComboBet } from '../src'

function twoLegs(odds: [number, number] = [1.5, 2]) {
  return [
    { marketId: 'm1', selectionId: 'A', odd: odds[0] },
    { marketId: 'm2', selectionId: 'X', odd: odds[1] },
  ]
}

test('rejects a ticket with fewer than 2 legs (INVALID_COMBO_LEGS)', () => {
  expect(
    () => new ComboBet({ bettorId: 'u1', stake: 1000, legs: [{ marketId: 'm1', selectionId: 'A', odd: 1.5 }] }),
  ).toThrow(ValidationError)
  try {
    new ComboBet({ bettorId: 'u1', stake: 1000, legs: [{ marketId: 'm1', selectionId: 'A', odd: 1.5 }] })
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.INVALID_COMBO_LEGS)
  }
})

test('rejects two legs on the same market (DUPLICATE_COMBO_MARKET)', () => {
  expect(
    () =>
      new ComboBet({
        bettorId: 'u1',
        stake: 1000,
        legs: [
          { marketId: 'm1', selectionId: 'A', odd: 1.5 },
          { marketId: 'm1', selectionId: 'B', odd: 2 },
        ],
      }),
  ).toThrow(expect.objectContaining({ code: Errors.DUPLICATE_COMBO_MARKET }))
})

test('rejects a leg with an odd of 1.00 or less (INVALID_COMBO_ODD)', () => {
  expect(() => new ComboBet({ bettorId: 'u1', stake: 1000, legs: twoLegs([1, 2]) })).toThrow(
    expect.objectContaining({ code: Errors.INVALID_COMBO_ODD }),
  )
})

test('totalOdd is the product of every leg odd', () => {
  const combo = new ComboBet({ bettorId: 'u1', stake: 1000, legs: twoLegs([1.5, 2]) })
  expect(combo.totalOdd).toBe(3)
})

test('all legs win -> ticket pays stake * totalOdd', () => {
  const combo = new ComboBet({ bettorId: 'u1', stake: 1000, legs: twoLegs([1.5, 2]) })
  combo.resolveLeg('m1', 'won')
  expect(combo.status).toBe('open') // m2 still pending
  combo.resolveLeg('m2', 'won')
  expect(combo.status).toBe('won')
  expect(combo.payout.cents).toBe(3000) // 1000 * 3.0
})

test('one leg loses -> ticket is lost immediately, even with a leg still pending', () => {
  const combo = new ComboBet({ bettorId: 'u1', stake: 1000, legs: twoLegs() })
  combo.resolveLeg('m1', 'lost')
  expect(combo.status).toBe('lost')
  expect(combo.payout.cents).toBe(0)

  // m2 never resolves (the market it's on could settle later) - stays a no-op.
  combo.resolveLeg('m2', 'won')
  expect(combo.status).toBe('lost')
})

test('a void leg refunds the whole ticket once every leg is resolved', () => {
  const combo = new ComboBet({ bettorId: 'u1', stake: 1000, legs: twoLegs() })
  combo.resolveLeg('m1', 'won')
  combo.resolveLeg('m2', 'void')
  expect(combo.status).toBe('refunded')
  expect(combo.payout.cents).toBe(1000)
})

test('resolveLeg is idempotent once the ticket already settled', () => {
  const combo = new ComboBet({ bettorId: 'u1', stake: 1000, legs: twoLegs() })
  combo.resolveLeg('m1', 'lost')
  combo.resolveLeg('m1', 'won') // no-op: the ticket is already lost
  expect(combo.status).toBe('lost')
})
