import { ValidationError, Errors } from 'shared'
import { RequestDeposit, SetDepositLimit, ListMyDepositLimitsQuery } from '../src'
import { WalletRepositoryInMemory } from './in-memory'

function setup() {
  const repository = new WalletRepositoryInMemory()
  return {
    repository,
    requestDeposit: new RequestDeposit(repository),
    setDepositLimit: new SetDepositLimit(repository),
    listMyDepositLimits: new ListMyDepositLimitsQuery(repository),
  }
}

test('a deposit within the daily limit is accepted', async () => {
  const { setDepositLimit, requestDeposit, repository } = setup()
  await setDepositLimit.execute({ userId: 'u1', period: 'daily', amount: 10_000 })

  await requestDeposit.execute({ userId: 'u1', amount: 8_000, receiptUrl: '/uploads/receipts/a.png' })

  expect(repository.payments).toHaveLength(1)
})

test('a deposit that would breach the daily limit is rejected (DEPOSIT_LIMIT_EXCEEDED)', async () => {
  const { setDepositLimit, requestDeposit } = setup()
  await setDepositLimit.execute({ userId: 'u1', period: 'daily', amount: 10_000 })
  await requestDeposit.execute({ userId: 'u1', amount: 7_000, receiptUrl: '/uploads/receipts/a.png' })

  await expect(
    requestDeposit.execute({ userId: 'u1', amount: 4_000, receiptUrl: '/uploads/receipts/b.png' }),
  ).rejects.toBeInstanceOf(ValidationError)
  await expect(
    requestDeposit.execute({ userId: 'u1', amount: 4_000, receiptUrl: '/uploads/receipts/b.png' }),
  ).rejects.toMatchObject({ code: Errors.DEPOSIT_LIMIT_EXCEEDED })
})

test('other users are unaffected by someone else\'s limit', async () => {
  const { setDepositLimit, requestDeposit, repository } = setup()
  await setDepositLimit.execute({ userId: 'u1', period: 'daily', amount: 1_000 })

  await requestDeposit.execute({ userId: 'u2', amount: 50_000, receiptUrl: '/uploads/receipts/a.png' })

  expect(repository.payments).toHaveLength(1)
})

test('a raised limit does not help an over-the-old-cap deposit until the grace period passes', async () => {
  const { setDepositLimit, requestDeposit } = setup()
  await setDepositLimit.execute({ userId: 'u1', period: 'daily', amount: 5_000 })
  await setDepositLimit.execute({ userId: 'u1', period: 'daily', amount: 50_000 }) // scheduled, not active yet

  await expect(
    requestDeposit.execute({ userId: 'u1', amount: 20_000, receiptUrl: '/uploads/receipts/a.png' }),
  ).rejects.toMatchObject({ code: Errors.DEPOSIT_LIMIT_EXCEEDED })
})

test('lowering the limit applies immediately, blocking a deposit that was fine before', async () => {
  const { setDepositLimit, requestDeposit } = setup()
  await setDepositLimit.execute({ userId: 'u1', period: 'daily', amount: 10_000 })
  await setDepositLimit.execute({ userId: 'u1', period: 'daily', amount: 3_000 })

  await expect(
    requestDeposit.execute({ userId: 'u1', amount: 5_000, receiptUrl: '/uploads/receipts/a.png' }),
  ).rejects.toMatchObject({ code: Errors.DEPOSIT_LIMIT_EXCEEDED })
})

test('lists the caps the user has set, including a scheduled increase', async () => {
  const { setDepositLimit, listMyDepositLimits } = setup()
  await setDepositLimit.execute({ userId: 'u1', period: 'daily', amount: 5_000 })
  await setDepositLimit.execute({ userId: 'u1', period: 'daily', amount: 20_000 })

  const [limit] = await listMyDepositLimits.execute('u1')
  expect(limit.amount).toBe(5_000)
  expect(limit.pendingAmount).toBe(20_000)
  expect(limit.effectiveAt).not.toBeNull()
})
