import { Bet } from '../model/bet'
import { ComboBetDTO } from '../model/combo-bet-dto'
import { ProfileStatsDTO } from '../model/profile-stats-dto'

// XP per WIN scales super-linearly with the number of legs (a 3-leg combo is
// much harder to hit than 3x a single bet, since the odds multiply): a simple
// bet is 1 "leg". Loss/open/refund never grant XP — same reasoning the
// leaderboard uses to ignore them (no skill signal).
const XP_BASE = 10
const XP_LEG_EXPONENT = 1.3

// Level requirement grows every level (100, 200, 300, ... more XP than the
// last) — an RPG-style curve, not a flat one, so early levels come fast and
// later ones take longer.
const LEVEL_STEP_XP = 100

/** Bettor XP/level progress from settled bets (pure/static, mirrors LeaderboardCalculator). */
export class LevelCalculator {
  static xpForWin(legs: number): number {
    return Math.round(XP_BASE * legs ** XP_LEG_EXPONENT)
  }

  // Cumulative XP required to REACH a level (level 1 needs 0).
  static cumulativeXpForLevel(level: number): number {
    return (LEVEL_STEP_XP * (level - 1) * level) / 2
  }

  static levelFor(totalXp: number): { level: number; xpIntoLevel: number; xpToNextLevel: number } {
    let level = 1
    while (this.cumulativeXpForLevel(level + 1) <= totalXp) level += 1

    return {
      level,
      xpIntoLevel: totalXp - this.cumulativeXpForLevel(level),
      xpToNextLevel: this.cumulativeXpForLevel(level + 1) - totalXp,
    }
  }

  static calculate(simpleBets: Bet[], combos: ComboBetDTO[]): ProfileStatsDTO {
    let wins = 0
    let losses = 0
    let xp = 0

    for (const bet of simpleBets) {
      if (bet.status === 'won') {
        wins += 1
        xp += this.xpForWin(1)
      } else if (bet.status === 'lost') {
        losses += 1
      }
    }

    for (const combo of combos) {
      if (combo.status === 'won') {
        wins += 1
        xp += this.xpForWin(combo.legs.length)
      } else if (combo.status === 'lost') {
        losses += 1
      }
    }

    return { wins, losses, xp, ...this.levelFor(xp) }
  }
}
