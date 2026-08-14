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

function withdrawal(): Payment {
  return new Payment({
    userId: 'user-1',
    direction: 'withdrawal',
    amount: 5000,
    referenceCode: 'WTH-1',
  })
}

test('markPaid moves a withdrawal to paid and attaches the payout receipt', () => {
  const payment = withdrawal()
  payment.markPaid('admin-1', '/uploads/receipts/payout.png')
  expect(payment.status).toBe('paid')
  expect(payment.receiptUrl).toBe('/uploads/receipts/payout.png')
})

test('markPaid records a WithdrawalPaid domain event', () => {
  const payment = withdrawal()
  payment.markPaid('admin-1', '/uploads/receipts/payout.png')

  const events = payment.pullDomainEvents()
  expect(events).toHaveLength(1)
  expect(events[0]).toBeInstanceOf(WithdrawalPaid)
})

test('markPaid without a receipt raises RECEIPT_REQUIRED', () => {
  const payment = withdrawal()
  try {
    payment.markPaid('admin-1', '')
    fail('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).code).toBe(Errors.RECEIPT_REQUIRED)
  }
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

test('rejecting a withdrawal without a reason raises REJECTION_REASON_REQUIRED', () => {
  const payment = withdrawal()
  try {
    payment.reject('admin-1')
    fail('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).code).toBe(Errors.REJECTION_REASON_REQUIRED)
  }
})

test('rejecting a withdrawal with a reason stores it and carries it on the event', () => {
  const payment = withdrawal()
  payment.reject('admin-1', 'chave Pix inválida')
  expect(payment.rejectionReason).toBe('chave Pix inválida')

  const events = payment.pullDomainEvents()
  expect(events[0]).toMatchObject({ direction: 'withdrawal', reason: 'chave Pix inválida' })
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
