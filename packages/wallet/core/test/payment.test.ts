import { Errors, ConflictError } from 'shared'
import { Payment } from '../src'

function deposit(): Payment {
  return new Payment({ userId: 'user-1', direction: 'deposit', amount: 5000, referenceCode: 'DEP-1' })
}

test('a fresh payment starts pending', () => {
  expect(deposit().status).toBe('pending')
})

test('confirm moves a deposit to confirmed and stamps the admin', () => {
  const payment = deposit()
  payment.confirm('admin-1')
  expect(payment.status).toBe('confirmed')
  expect(payment.confirmedBy).toBe('admin-1')
  expect(payment.confirmedAt).toBeInstanceOf(Date)
})

test('markPaid moves a withdrawal to paid', () => {
  const payment = new Payment({
    userId: 'user-1',
    direction: 'withdrawal',
    amount: 5000,
    referenceCode: 'WTH-1',
  })
  payment.markPaid('admin-1')
  expect(payment.status).toBe('paid')
})

test('reject moves a pending payment to rejected', () => {
  const payment = deposit()
  payment.reject('admin-1')
  expect(payment.status).toBe('rejected')
})

test('settling a non-pending payment raises PAYMENT_ALREADY_SETTLED', () => {
  const payment = deposit()
  payment.confirm('admin-1')
  try {
    payment.confirm('admin-1')
    fail('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).code).toBe(Errors.PAYMENT_ALREADY_SETTLED)
  }
})
