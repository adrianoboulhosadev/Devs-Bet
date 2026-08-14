'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { TournamentDTO, CreateTournamentInput } from '@tournament/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { useParticipants } from '@/hooks/use-participants'
import { roundCountOf, roundLabelOf } from '@/lib/tournament-bracket'
import { DEFAULT_TOURNAMENT_SIZE, TOURNAMENT_SIZES } from '../data/tournament-options'

const TOURNAMENTS_KEY = ['tournaments']

// Mirrors CreateTournamentInput minus the wire concerns: image is an optional
// FileList; participants are picked from the catalog (see ParticipantPicker),
// not typed — size caps how many the picker accepts; bestOfByRound has one
// entry per round (index 0 = fullest round, last = the final) so e.g. every
// round can be MD3 except an MD5 final; categoryId is the chosen LEAF (set by
// the CategoryPicker).
interface TournamentForm {
  title: string
  categoryId: string
  scheduledAt: string
  size: number
  bestOfByRound: number[]
  // Already CROPPED by the ImagePicker — what the admin framed is what uploads.
  image: File | null
  participantIds: string[]
}

const emptyForm = (): TournamentForm => ({
  title: '',
  categoryId: '',
  scheduledAt: '',
  size: DEFAULT_TOURNAMENT_SIZE,
  bestOfByRound: Array(Math.log2(DEFAULT_TOURNAMENT_SIZE)).fill(1),
  image: null,
  participantIds: [],
})

export function useTournaments() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { categories, pathOf } = useCategories()
  const { participants } = useParticipants()

  const query = useQuery({
    queryKey: TOURNAMENTS_KEY,
    queryFn: async (): Promise<TournamentDTO[]> =>
      (await api.get<TournamentDTO[]>('/tournament')).data,
  })

  const form = useForm<TournamentForm>({ defaultValues: emptyForm() })
  const size = Number(form.watch('size'))
  // bestOfByRound has one entry per KNOCKOUT round, not per raw participant —
  // above the group-stage threshold the bracket only starts once the group
  // stage narrows the field to its qualifiers (size / 2).
  const roundCount = TOURNAMENT_SIZES.includes(size) ? roundCountOf(size) : 0

  // Drop any already-picked participants beyond the new size (the picker caps
  // further additions at `size`).
  useEffect(() => {
    if (!TOURNAMENT_SIZES.includes(size)) return
    const current = form.getValues('participantIds')
    if (current.length > size) form.setValue('participantIds', current.slice(0, size))
  }, [size, form])

  // Keep exactly `roundCount` bestOf fields, preserving any choices already made.
  useEffect(() => {
    if (!roundCount) return
    const current = form.getValues('bestOfByRound') ?? []
    if (current.length === roundCount) return
    const next = Array.from({ length: roundCount }, (_, index) => current[index] ?? 1)
    form.setValue('bestOfByRound', next)
  }, [roundCount, form])

  const roundLabel = (round: number): string => roundLabelOf(round, roundCount)

  const creation = useMutation({
    mutationFn: async (data: TournamentForm): Promise<{ id: string }> => {
      // Optional image: upload first (multipart, reusing the matchs folder), then
      // create the tournament with the returned URL. No cloud.
      let imageUrl: string | null = null
      const file = data.image
      if (file) {
        const upload = new FormData()
        upload.append('image', file)
        imageUrl = (await api.post<{ url: string }>('/upload/matchs', upload)).data.url
      }

      const input: CreateTournamentInput = {
        title: data.title,
        categoryId: data.categoryId,
        imageUrl,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        size: Number(data.size),
        bestOfByRound: data.bestOfByRound.map(Number),
        participantIds: data.participantIds,
      }
      return (await api.post<{ id: string }>('/tournament', input)).data
    },
    onSuccess: (created) => {
      form.reset(emptyForm())
      queryClient.invalidateQueries({ queryKey: TOURNAMENTS_KEY })
      notify.success('Torneio criado.')
      router.push(`/tournaments/${created.id}`)
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível criar o torneio.'),
  })

  const onSubmit = form.handleSubmit((data) => {
    if (!data.categoryId) {
      notify.error('Selecione a categoria (até o nível mais específico).')
      return
    }
    if (data.participantIds.length !== data.size) {
      notify.error(`Escolha exatamente ${data.size} participantes.`)
      return
    }
    creation.mutate(data)
  })

  return {
    isAdmin,
    tournaments: query.data ?? [],
    loading: query.isLoading,
    categories,
    pathOf,
    participants,
    form,
    roundCount,
    roundLabel,
    onSubmit,
    submitting: creation.isPending,
  }
}
