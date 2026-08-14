'use client'

import { useState } from 'react'
import type { ParticipantDTO } from '@participant/adapters'

interface UseParticipantPickerInput {
  participants: ParticipantDTO[]
  value: string[]
  onChange: (participantIds: string[]) => void
  max?: number
}

export function useParticipantPicker({ participants, value, onChange, max }: UseParticipantPickerInput) {
  const [search, setSearch] = useState('')

  const filtered = participants.filter((participant) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return (
      participant.name.toLowerCase().includes(term) ||
      participant.nickname?.toLowerCase().includes(term)
    )
  })

  return {
    search,
    setSearch,
    filtered,
    atMax: max !== undefined && value.length >= max,
    toggle: (participantId: string) => {
      if (value.includes(participantId)) {
        onChange(value.filter((id) => id !== participantId))
        return
      }
      if (max !== undefined && value.length >= max) return
      onChange([...value, participantId])
    },
  }
}
