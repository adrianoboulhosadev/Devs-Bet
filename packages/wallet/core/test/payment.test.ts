import { Errors, ConflictError, ValidationError } from 'shared'
import { Payment, DepositConfirmed, WithdrawalPaid, PaymentRejected } from '../src'

function deposit(): Payment {
  return new Payment({
    userId: 'user-1',
    direction: 'deposit',
    amount: 5000,
    referenceCode: 'DEP-1',
    receiptUrl: '/uploads/receipts/proof.png',
  })
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

test('confirm records a DepositConfirmed domain event', () => {
  const payment = deposit()
  payment.confirm('admin-1')

  const events = payment.pullDomainEvents()
  expect(events).toHaveLength(1)
  expect(events[0]).toBeInstanceOf(DepositConfirmed)
  expect(events[0]).toMatchObject({ paymentId: payment.id.value, userId: 'user-1', amount: 5000 })
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

test('markPaid records a WithdrawalPaid domain event', () => {
  const payment = new Payment({
    userId: 'user-1',
    direction: 'withdrawal',
    amount: 5000,
    referenceCode: 'WTH-1',
  })
  payment.markPaid('admin-1')

  const events = payment.pullDomainEvents()
  expect(events).toHaveLength(1)
  expect(events[0]).toBeInstanceOf(WithdrawalPaid)
})

test('reject moves a pending payment to rejected', () => {
  const payment = deposit()
  payment.reject('admin-1')
  expect(payment.status).toBe('rejected')
})

test('reject records a PaymentRejected event carrying the direction', () => {
  const payment = deposit()
  payment.reject('admin-1')

  const events = payment.pullDomainEvents()
  expect(events).toHaveLength(1)
  expect(events[0]).toBeInstanceOf(PaymentRejected)
  expect(events[0]).toMatchObject({ direction: 'deposit', amount: 5000 })
})

test('pullDomainEvents drains the list — a second call comes back empty', () => {
  const payment = deposit()
  payment.confirm('admin-1')

  expect(payment.pullDomainEvents()).toHaveLength(1)
  expect(payment.pullDomainEvents()).toHaveLength(0)
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

test('a deposit without a receipt raises RECEIPT_REQUIRED', () => {
  try {
    new Payment({ userId: 'user-1', direction: 'deposit', amount: 5000, referenceCode: 'DEP-1' })
    fail('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).code).toBe(Errors.RECEIPT_REQUIRED)
  }
})

test('a withdrawal never needs a receipt', () => {
  const payment = new Payment({
    userId: 'user-1',
    direction: 'withdrawal',
    amount: 5000,
    referenceCode: 'WTH-1',
  })
  expect(payment.receiptUrl).toBeNull()
})
