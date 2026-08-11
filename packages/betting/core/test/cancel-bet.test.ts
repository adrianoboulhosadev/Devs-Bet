import { NotFoundError, ConflictError, Errors } from 'shared'
import { CancelBet, CancelComboBet, Bet, ComboBet } from '../src'
import { BettingRepositoryInMemory } from './in-memory'

const BETTOR = 'bettor-1'
const MARKET = 'match-1'

function openBet(repository: BettingRepositoryInMemory): Bet {
  const bet = new Bet({ marketId: MARKET, bettorId: BETTOR, selectionId: 'A', stake: 1000 })
  repository.bets.push(bet)
  return bet
}

function openCombo(repository: BettingRepositoryInMemory): ComboBet {
  const combo = new ComboBet({
    bettorId: BETTOR,
    stake: 1000,
    legs: [
      { marketId: 'm1', selectionId: 'A', odd: 2 },
      { marketId: 'm2', selectionId: 'B', odd: 3 },
    ],
  })
  repository.combos.push(combo)
  return combo
}

test('the bettor cancels an open bet while the market is open and is refunded', async () => {
  const repository = new BettingRepositoryInMemory()
  const bet = openBet(repository)

  await new CancelBet(repository).execute({
    betId: bet.id.value,
    bettorId: BETTOR,
    marketOpen: true,
  })

  expect(bet.status).toBe('refunded')
  expect(bet.payout.cents).toBe(1000) // the stake comes back
})

test('cancelling is refused once the market closed (BETTING_CLOSED)', async () => {
  const repository = new BettingRepositoryInMemory()
  const bet = openBet(repository)

  const cancel = new CancelBet(repository).execute({
    betId: bet.id.value,
    bettorId: BETTOR,
    marketOpen: false,
  })

  await expect(cancel).rejects.toBeInstanceOf(ConflictError)
  await expect(cancel).rejects.toMatchObject({ code: Errors.BETTING_CLOSED })
  expect(bet.status).toBe('open')
})

test('someone else’s bet is invisible: cancelling it fails as BET_NOT_FOUND', async () => {
  const repository = new BettingRepositoryInMemory()
  const bet = openBet(repository)

  const cancel = new CancelBet(repository).execute({
    betId: bet.id.value,
    bettorId: 'another-bettor',
    marketOpen: true,
  })

  await expect(cancel).rejects.toBeInstanceOf(NotFoundError)
  await expect(cancel).rejects.toMatchObject({ code: Errors.BET_NOT_FOUND })
  expect(bet.status).toBe('open')
})

test('an already settled bet cannot be cancelled (BET_NOT_OPEN)', async () => {
  const repository = new BettingRepositoryInMemory()
  const bet = openBet(repository)
  bet.settleAsLoser()

  const cancel = new CancelBet(repository).execute({
    betId: bet.id.value,
    bettorId: BETTOR,
    marketOpen: true,
  })

  await expect(cancel).rejects.toBeInstanceOf(ConflictError)
  await expect(cancel).rejects.toMatchObject({ code: Errors.BET_NOT_OPEN })
})

test('cancelling a combo refunds the stake and voids every leg', async () => {
  const repository = new BettingRepositoryInMemory()
  const combo = openCombo(repository)

  await new CancelComboBet(repository).execute({
    comboBetId: combo.id.value,
    bettorId: BETTOR,
    allMarketsOpen: true,
  })

  expect(combo.status).toBe('refunded')
  expect(combo.payout.cents).toBe(1000)
  expect(combo.legs.map((leg) => leg.result)).toEqual(['void', 'void'])
})

test('a combo cannot be cancelled once ANY of its markets closed', async () => {
  const repository = new BettingRepositoryInMemory()
  const combo = openCombo(repository)

  const cancel = new CancelComboBet(repository).execute({
    comboBetId: combo.id.value,
    bettorId: BETTOR,
    allMarketsOpen: false,
  })

  await expect(cancel).rejects.toMatchObject({ code: Errors.BETTING_CLOSED })
  expect(combo.status).toBe('open')
  expect(combo.legs.every((leg) => leg.isPending)).toBe(true)
})
