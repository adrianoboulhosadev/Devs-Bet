import { ConflictError, ValidationError, Errors } from 'shared'
import { PlaceBet, PlaceComboBet, SetStakeLimit, GetMyStakeLimitQuery } from '../src'
import { BettingRepositoryInMemory } from './in-memory'

const OPEN_MATCH = {
  marketType: 'match' as const,
  marketOpen: true,
  selectionIds: ['A', 'B'],
  bettorSelfExcluded: false,
}

const COMBO_LEG = (marketId: string, selectionId: string, odd: number) => ({
  marketType: 'match' as const,
  marketId,
  selectionId,
  odd,
  marketOpen: true,
  selectionIds: ['A', 'B', 'X', 'Y'],
})

function setup() {
  const repository = new BettingRepositoryInMemory()
  return {
    repository,
    placeBet: new PlaceBet(repository, repository),
    placeCombo: new PlaceComboBet(repository, repository),
    setStakeLimit: new SetStakeLimit(repository),
    getMyStakeLimit: new GetMyStakeLimitQuery(repository),
  }
}

test('a self-excluded bettor cannot place a bet (SELF_EXCLUDED)', async () => {
  const { placeBet } = setup()
  await expect(
    placeBet.execute({
      marketId: 'm1',
      bettorId: 'u1',
      selectionId: 'A',
      stake: 1000,
      ...OPEN_MATCH,
      bettorSelfExcluded: true,
    }),
  ).rejects.toBeInstanceOf(ConflictError)
})

test('a self-excluded bettor cannot place a combo ticket (SELF_EXCLUDED)', async () => {
  const { placeCombo } = setup()
  await expect(
    placeCombo.execute({
      bettorId: 'u1',
      stake: 1000,
      legs: [COMBO_LEG('m1', 'A', 1.5), COMBO_LEG('m2', 'X', 2)],
      bettorSelfExcluded: true,
    }),
  ).rejects.toMatchObject({ code: Errors.SELF_EXCLUDED })
})

test('a bet within the daily stake limit is accepted', async () => {
  const { placeBet, setStakeLimit, repository } = setup()
  await setStakeLimit.execute({ bettorId: 'u1', amount: 10_000 })

  await placeBet.execute({ marketId: 'm1', bettorId: 'u1', selectionId: 'A', stake: 8_000, ...OPEN_MATCH })
  expect(repository.bets).toHaveLength(1)
})

test('a bet that would breach the daily stake limit is rejected (STAKE_LIMIT_EXCEEDED)', async () => {
  const { placeBet, setStakeLimit } = setup()
  await setStakeLimit.execute({ bettorId: 'u1', amount: 10_000 })
  await placeBet.execute({ marketId: 'm1', bettorId: 'u1', selectionId: 'A', stake: 7_000, ...OPEN_MATCH })

  await expect(
    placeBet.execute({ marketId: 'm2', bettorId: 'u1', selectionId: 'A', stake: 4_000, ...OPEN_MATCH }),
  ).rejects.toBeInstanceOf(ValidationError)
  await expect(
    placeBet.execute({ marketId: 'm2', bettorId: 'u1', selectionId: 'A', stake: 4_000, ...OPEN_MATCH }),
  ).rejects.toMatchObject({ code: Errors.STAKE_LIMIT_EXCEEDED })
})

test('a single bet and a combo ticket share the same daily stake budget', async () => {
  const { placeBet, placeCombo, setStakeLimit } = setup()
  await setStakeLimit.execute({ bettorId: 'u1', amount: 10_000 })
  await placeBet.execute({ marketId: 'm1', bettorId: 'u1', selectionId: 'A', stake: 7_000, ...OPEN_MATCH })

  await expect(
    placeCombo.execute({
      bettorId: 'u1',
      stake: 4_000,
      legs: [COMBO_LEG('m2', 'A', 1.5), COMBO_LEG('m3', 'X', 2)],
      bettorSelfExcluded: false,
    }),
  ).rejects.toMatchObject({ code: Errors.STAKE_LIMIT_EXCEEDED })
})

test('lists the stake cap the bettor has set, including a scheduled increase', async () => {
  const { setStakeLimit, getMyStakeLimit } = setup()
  await setStakeLimit.execute({ bettorId: 'u1', amount: 5_000 })
  await setStakeLimit.execute({ bettorId: 'u1', amount: 20_000 })

  const limit = await getMyStakeLimit.execute('u1')
  expect(limit?.amount).toBe(5_000)
  expect(limit?.pendingAmount).toBe(20_000)
})
