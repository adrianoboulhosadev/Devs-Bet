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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Participantes</span>
        <span className="text-xs text-slate-500">
          {value.length}
          {max !== undefined ? ` / ${max}` : ''} selecionado{value.length === 1 ? '' : 's'}
        </span>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nome ou apelido…"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />

      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-1 text-sm text-slate-500">
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
                className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${
                  disabled ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(participant.id)}
                />
                {participant.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(participant.imageUrl)}
                    alt={participant.name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded-full bg-slate-200" />
                )}
                <span className="font-medium">{participant.name}</span>
                {participant.nickname && (
                  <span className="text-xs text-slate-400">"{participant.nickname}"</span>
                )}
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}
