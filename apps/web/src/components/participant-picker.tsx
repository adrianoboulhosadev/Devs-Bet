'use client'

import { useState } from 'react'
import type { ParticipantDTO } from '@participant/adapters'
import { mediaUrl } from '@/lib/media'

interface ParticipantPickerProps {
  participants: ParticipantDTO[]
  // Selected participant ids, in the order picked (order matters for the title
  // shown in the lobby — "A vs B" — and, for a tournament, the seeding).
  value: string[]
  onChange: (participantIds: string[]) => void
  // Exact count required (tournament: must equal `size`). Omit for an open
  // minimum (match: at least two, enforced by the caller/domain).
  max?: number
}

/**
 * Search + checkbox list over the participant catalog (see packages/participant)
 * — replaces typing a name every time a match/tournament is created. Only
 * catalog entries can be picked (no free-text fallback); manage the catalog
 * itself at /participants.
 */
export function ParticipantPicker({ participants, value, onChange, max }: ParticipantPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = participants.filter((participant) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return (
      participant.name.toLowerCase().includes(term) ||
      participant.nickname?.toLowerCase().includes(term)
    )
  })

  const toggle = (participantId: string) => {
    if (value.includes(participantId)) {
      onChange(value.filter((id) => id !== participantId))
      return
    }
    if (max !== undefined && value.length >= max) return
    onChange([...value, participantId])
  }

  const atMax = max !== undefined && value.length >= max

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">PARTICIPANTES</span>
        <span className="font-arcade text-lg text-arcade-text-muted">
          {value.length}
          {max !== undefined ? ` / ${max}` : ''} selecionado{value.length === 1 ? '' : 's'}
        </span>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nome ou apelido…"
        className="w-full border-3 border-arcade-border bg-[#0b0714] px-3 py-2 font-arcade text-lg text-arcade-text outline-none focus:border-arcade-cyan"
      />

      <div className="max-h-64 space-y-1 overflow-y-auto border-3 border-arcade-border p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-1 font-arcade text-lg text-arcade-text-muted">
            {participants.length === 0
              ? 'Nenhum participante cadastrado ainda — cadastre em /participants.'
              : 'Nenhum resultado.'}
          </p>
        ) : (
          filtered.map((participant) => {
            const checked = value.includes(participant.id)
            const disabled = !checked && atMax
            return (
              <label
                key={participant.id}
                className={`flex items-center gap-2 px-2 py-1.5 font-arcade text-lg ${
                  disabled ? 'opacity-50' : 'cursor-pointer hover:bg-[#1d1233]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(participant.id)}
                  className="h-5 w-5 accent-arcade-magenta"
                />
                {participant.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(participant.imageUrl)}
                    alt={participant.name}
                    className="h-6 w-6 object-cover"
                  />
                ) : (
                  <span className="h-6 w-6 shrink-0 bg-arcade-border" />
                )}
                <span className="text-arcade-text">{participant.name}</span>
                {participant.nickname && (
                  <span className="text-base text-arcade-text-muted">"{participant.nickname}"</span>
                )}
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}
