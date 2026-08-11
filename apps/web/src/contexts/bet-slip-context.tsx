'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { BetMarketType } from '@betting/adapters'

/** One pick sitting in the slip. Labels are carried along so the panel can render
 * without refetching the market it came from. */
export interface SlipSelection {
  marketType: BetMarketType
  // The market: a match id or a tournament id.
  marketId: string
  selectionId: string
  marketLabel: string
  selectionLabel: string
}

interface BetSlip {
  selections: SlipSelection[]
  /** Adds the pick, or removes it if the very same one is already in (clicking
   * the odd again unpicks it). A DIFFERENT pick on a market already in the slip
   * REPLACES it — a ticket may hold at most one selection per market, which is
   * what `ComboBet` requires (DUPLICATE_COMBO_MARKET) and what every sportsbook
   * does when you click another outcome of the same game. */
  toggle: (selection: SlipSelection) => void
  remove: (marketId: string) => void
  clear: () => void
  has: (marketId: string, selectionId: string) => boolean
}

const BetSlipContext = createContext<BetSlip | null>(null)

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<SlipSelection[]>([])

  const toggle = useCallback((selection: SlipSelection) => {
    setSelections((current) => {
      const sameMarket = current.find((entry) => entry.marketId === selection.marketId)
      if (sameMarket?.selectionId === selection.selectionId) {
        return current.filter((entry) => entry.marketId !== selection.marketId)
      }
      if (sameMarket) {
        return current.map((entry) => (entry.marketId === selection.marketId ? selection : entry))
      }
      return [...current, selection]
    })
  }, [])

  const remove = useCallback((marketId: string) => {
    setSelections((current) => current.filter((entry) => entry.marketId !== marketId))
  }, [])

  const clear = useCallback(() => setSelections([]), [])

  const has = useCallback(
    (marketId: string, selectionId: string) =>
      selections.some(
        (entry) => entry.marketId === marketId && entry.selectionId === selectionId,
      ),
    [selections],
  )

  const value = useMemo(
    () => ({ selections, toggle, remove, clear, has }),
    [selections, toggle, remove, clear, has],
  )

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>
}

export function useBetSlip(): BetSlip {
  const context = useContext(BetSlipContext)
  if (!context) throw new Error('useBetSlip must be used inside a BetSlipProvider')
  return context
}
