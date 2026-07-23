import { AuthenticatedActor, AccessDeniedError, Errors, ConflictError } from 'shared'
import { RequestDeposit, ConfirmDeposit, GetMyWalletQuery } from '../src'
import { WalletRepositoryInMemory } from './in-memory'

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }
const user: AuthenticatedActor = { id: 'user-1', role: 'user' }

function setup() {
  const repository = new WalletRepositoryInMemory()
  return {
    repository,
    requestDeposit: new RequestDeposit(repository),
    confirmDeposit: new ConfirmDeposit(repository),
    getWallet: new GetMyWalletQuery(repository),
  }
}

test('a deposit request creates a pending payment with a reference code', async () => {
  const { repository, requestDeposit } = setup()
  await requestDeposit.execute({ userId: 'user-1', amount: 5000 })

  expect(repository.payments).toHaveLength(1)
  expect(repository.payments[0]).toMatchObject({ status: 'pending', direction: 'deposit', amount: 5000 })
  expect(repository.payments[0].referenceCode).toMatch(/^DEP-/)
})

test('admin confirmation credits the wallet and writes the ledger', async () => {
  const { repository, requestDeposit, confirmDeposit, getWallet } = setup()
  await requestDeposit.execute({ userId: 'user-1', amount: 5000 })
  const paymentId = repository.payments[0].id

  await confirmDeposit.execute({ paymentId }, admin)

  const wallet = await getWallet.execute('user-1')
  expect(wallet.balance).toBe(5000)
  expect(wallet.available).toBe(5000)
  expect(repository.ledger).toHaveLength(1)
  expect(repository.ledger[0]).toMatchObject({ type: 'deposit', amount: 5000 })
  expect(repository.payments[0].status).toBe('confirmed')
})

test('a non-admin cannot confirm a deposit (NOT_ADMIN)', async () => {
  const { repository, requestDeposit, confirmDeposit } = setup()
  await requestDeposit.execute({ userId: 'user-1', amount: 5000 })
  const paymentId = repository.payments[0].id

  await expect(confirmDeposit.execute({ paymentId }, user)).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(confirmDeposit.execute({ paymentId }, user)).rejects.toMatchObject({
    code: Errors.NOT_ADMIN,
  })
})

test('confirming the same deposit twice raises PAYMENT_ALREADY_SETTLED', async () => {
  const { repository, requestDeposit, confirmDeposit } = setup()
  await requestDeposit.execute({ userId: 'user-1', amount: 5000 })
  const paymentId = repository.payments[0].id

  await confirmDeposit.execute({ paymentId }, admin)
  await expect(confirmDeposit.execute({ paymentId }, admin)).rejects.toBeInstanceOf(ConflictError)
})
