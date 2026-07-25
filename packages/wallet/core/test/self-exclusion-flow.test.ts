import { ConflictError, Errors } from 'shared'
import { StartSelfExclusion, GetMySelfExclusionQuery, RequestDeposit } from '../src'
import { WalletRepositoryInMemory } from './in-memory'

function setup() {
  const repository = new WalletRepositoryInMemory()
  return {
    repository,
    startSelfExclusion: new StartSelfExclusion(repository),
    getMySelfExclusion: new GetMySelfExclusionQuery(repository),
    requestDeposit: new RequestDeposit(repository),
  }
}

test('starting a self-exclusion is visible on the read side', async () => {
  const { startSelfExclusion, getMySelfExclusion } = setup()
  await startSelfExclusion.execute({ userId: 'u1', period: '7d' })

  const exclusion = await getMySelfExclusion.execute('u1')
  expect(exclusion?.period).toBe('7d')
  expect(exclusion?.until).not.toBeNull()
})

test('cannot start a new self-exclusion while one is already active (ALREADY_SELF_EXCLUDED)', async () => {
  const { startSelfExclusion } = setup()
  await startSelfExclusion.execute({ userId: 'u1', period: '24h' })

  await expect(startSelfExclusion.execute({ userId: 'u1', period: '30d' })).rejects.toBeInstanceOf(
    ConflictError,
  )
  await expect(startSelfExclusion.execute({ userId: 'u1', period: '30d' })).rejects.toMatchObject({
    code: Errors.ALREADY_SELF_EXCLUDED,
  })
})

test('a self-excluded user cannot request a deposit (SELF_EXCLUDED)', async () => {
  const { startSelfExclusion, requestDeposit } = setup()
  await startSelfExclusion.execute({ userId: 'u1', period: 'permanent' })

  await expect(
    requestDeposit.execute({ userId: 'u1', amount: 5_000, receiptUrl: '/uploads/receipts/a.png' }),
  ).rejects.toMatchObject({ code: Errors.SELF_EXCLUDED })
})

test('other users are unaffected by someone else\'s self-exclusion', async () => {
  const { startSelfExclusion, requestDeposit, repository } = setup()
  await startSelfExclusion.execute({ userId: 'u1', period: 'permanent' })

  await requestDeposit.execute({ userId: 'u2', amount: 5_000, receiptUrl: '/uploads/receipts/a.png' })
  expect(repository.payments).toHaveLength(1)
})
