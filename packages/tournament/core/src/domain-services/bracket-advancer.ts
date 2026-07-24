import { BracketBuilder } from './bracket-builder'

/** Where a slot's winner goes next: the parent slot and which side it fills. */
export interface SlotParent {
  round: number
  position: number
  side: 'A' | 'B'
}

/**
 * Pure domain service that maps a bracket slot to its parent. The winner of slot
 * (round, position) advances to (round + 1, position / 2), taking side A when the
 * child position is even and side B when odd. Returns null when the slot is the
 * final — its winner is the champion, not an input to another match. Static and
 * side-effect-free; the Tournament aggregate uses it to advance the bracket.
 */
export class BracketAdvancer {
  static parentOf(round: number, position: number, size: number): SlotParent | null {
    const finalRound = BracketBuilder.roundCount(size) - 1
    if (round >= finalRound) return null
    return {
      round: round + 1,
      position: Math.floor(position / 2),
      side: position % 2 === 0 ? 'A' : 'B',
    }
  }
}
