import { AuthenticatedActor, Errors, ValidationError } from 'shared'
import {
  RequestDeposit,
  ConfirmDeposit,
  RequestWithdrawal,
  ConfirmWithdrawal,
  RejectPayment,
  GetMyWalletQuery,
} from '../src'
import { WalletRepositoryInMemory } from './in-memory'

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }

async function setupWithBalance(amount: number) {
  const repository = new WalletRepositoryInMemory()
  const getWallet = new GetMyWalletQuery(repository)
  await new RequestDeposit(repository).execute({ userId: 'user-1', amount })
  await new ConfirmDeposit(repository).execute({ paymentId: repository.payments[0].id }, admin)
  return {
    repository,
    getWallet,
    requestWithdrawal: new RequestWithdrawal(repository),
    confirmWithdrawal: new ConfirmWithdrawal(repository),
    rejectPayment: new RejectPayment(repository),
  }
}

test('a withdrawal request holds the funds (reduces available, keeps balance)', async () => {
  const { getWallet, requestWithdrawal } = await setupWithBalance(10000)
  await requestWithdrawal.execute({ userId: 'user-1', amount: 4000 })

  const wallet = await getWallet.execute('user-1')
  expect(wallet.balance).toBe(10000)
  expect(wallet.held).toBe(4000)
  expect(wallet.available).toBe(6000)
})

test('withdrawing more than available raises INSUFFICIENT_BALANCE', async () => {
  const { requestWithdrawal } = await setupWithBalance(3000)
  await expect(
    requestWithdrawal.execute({ userId: 'user-1', amount: 3001 }),
  ).rejects.toMatchObject({ code: Errors.INSUFFICIENT_BALANCE })
})

test('admin paying the withdrawal settles the hold (balance and held down)', async () => {
  const { repository, getWallet, requestWithdrawal, confirmWithdrawal } =
    await setupWithBalance(10000)
  await requestWithdrawal.execute({ userId: 'user-1', amount: 4000 })
  const withdrawal = repository.payments.find((payment) => payment.direction === 'withdrawal')!

  await confirmWithdrawal.execute({ paymentId: withdrawal.id }, admin)

  const wallet = await getWallet.execute('user-1')
  expect(wallet.balance).toBe(6000)
  expect(wallet.held).toBe(0)
  expect(repository.ledger.some((entry) => entry.type === 'withdrawal' && entry.amount === 4000)).toBe(
    true,
  )
})

test('rejecting a withdrawal releases the hold back to available', async () => {
  const { repository, getWallet, requestWithdrawal, rejectPayment } = await setupWithBalance(10000)
  await requestWithdrawal.execute({ userId: 'user-1', amount: 4000 })
  const withdrawal = repository.payments.find((payment) => payment.direction === 'withdrawal')!

  await rejectPayment.execute({ paymentId: withdrawal.id }, admin)

  const wallet = await getWallet.execute('user-1')
  expect(wallet.balance).toBe(10000)
  expect(wallet.held).toBe(0)
  expect(wallet.available).toBe(10000)
})
