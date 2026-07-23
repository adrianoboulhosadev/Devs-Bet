import { Bet } from '../model'
import { MatchOddsDTO, ParticipantOdds } from '../model'

/**
 * Live (indicative) odds from the current open bets (pure, static). Groups the
 * stakes by participant and derives the implied odd = distributable / pool. These
 * float while the match is open and are only indicative — settlement uses the
 * final pool via the PayoutCalculator.
 */
export class OddsCalculator {
  static calculate(matchId: string, bets: Bet[], rakeBasisPoints = 0): MatchOddsDTO {
    const total = bets.reduce((sum, bet) => sum + bet.stake.cents, 0)
    const rake = Math.floor((total * rakeBasisPoints) / 10_000)
    const distributable = total - rake

    const byParticipant = new Map<string, { pool: number; bettors: number }>()
    for (const bet of bets) {
      const current = byParticipant.get(bet.participantId) ?? { pool: 0, bettors: 0 }
      current.pool += bet.stake.cents
      current.bettors += 1
      byParticipant.set(bet.participantId, current)
    }

    const entries: ParticipantOdds[] = [...byParticipant.entries()].map(([participantId, data]) => ({
      participantId,
      pool: data.pool,
      bettors: data.bettors,
      impliedOdd: data.pool === 0 ? 0 : Math.round((distributable / data.pool) * 100) / 100,
    }))

    return { matchId, totalPool: total, entries }
  }
}
