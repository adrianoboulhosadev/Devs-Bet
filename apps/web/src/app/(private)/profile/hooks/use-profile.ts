'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useProfileStats, PROFILE_STATS_KEY } from '@/hooks/use-profile-stats'

interface NicknameFields {
  nickname: string
}

export function useProfile() {
  const queryClient = useQueryClient()
  const { data: profile, isLoading } = useProfileStats()
  const [editingNickname, setEditingNickname] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const form = useForm<NicknameFields>({ defaultValues: { nickname: '' } })

  useEffect(() => {
    if (profile) form.reset({ nickname: profile.nickname ?? '' })
  }, [profile, form])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PROFILE_STATS_KEY })

  const updateNickname = useMutation({
    mutationFn: (nickname: string) => api.patch('/user/me', { nickname: nickname.trim() || null }),
    onSuccess: () => {
      setEditingNickname(false)
      invalidate()
      notify.success('Apelido atualizado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível salvar o apelido.'),
  })

  const updateAvatar = useMutation({
    mutationFn: async (file: File) => {
      const upload = new FormData()
      upload.append('file', file)
      const { url } = (await api.post<{ url: string }>('/upload/avatars', upload)).data
      await api.patch('/user/me', { avatarUrl: url })
    },
    onSuccess: () => {
      invalidate()
      notify.success('Foto atualizada.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível enviar a foto.'),
    onSettled: () => setUploadingAvatar(false),
  })

  const onAvatarChange = (file: File | undefined) => {
    if (!file) return
    setUploadingAvatar(true)
    updateAvatar.mutate(file)
  }

  const onSubmitNickname = form.handleSubmit((data) => updateNickname.mutate(data.nickname))

  return {
    profile,
    loading: isLoading,
    form,
    editingNickname,
    startEditingNickname: () => setEditingNickname(true),
    cancelEditingNickname: () => {
      form.reset({ nickname: profile?.nickname ?? '' })
      setEditingNickname(false)
    },
    onSubmitNickname,
    savingNickname: updateNickname.isPending,
    onAvatarChange,
    uploadingAvatar,
  }
}
