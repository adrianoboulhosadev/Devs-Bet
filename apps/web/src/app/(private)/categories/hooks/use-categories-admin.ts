'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/contexts/auth-context'
import { useCategories, CATEGORIES_KEY } from '@/hooks/use-categories'

interface CreateFields {
  name: string
  parentId: string // '' = root
}

export function useCategoriesAdmin() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { categories, loading, pathOf } = useCategories()
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
  const fail = (failure: unknown, fallback: string) => setError(errorMessage(failure, fallback))

  const form = useForm<CreateFields>({ defaultValues: { name: '', parentId: '' } })

  const create = useMutation({
    mutationFn: (input: { name: string; parentId: string | null }) => api.post('/category', input),
    onSuccess: () => {
      form.reset({ name: '', parentId: '' })
      invalidate()
    },
    onError: (failure) => fail(failure, 'Não foi possível criar a categoria.'),
  })

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/category/${id}`, { name }),
    onSuccess: invalidate,
    onError: (failure) => fail(failure, 'Não foi possível renomear.'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/category/${id}`),
    onSuccess: invalidate,
    onError: (failure) => fail(failure, 'Não foi possível excluir (só folhas sem filhos).'),
  })

  const onSubmit = form.handleSubmit((data) => {
    setError(null)
    create.mutate({ name: data.name.trim(), parentId: data.parentId || null })
  })

  // Categories sorted by their full path so the hierarchy reads top-down.
  const ordered = [...categories].sort((first, second) =>
    pathOf(first.id).localeCompare(pathOf(second.id)),
  )

  return {
    isAdmin,
    loading,
    categories,
    ordered,
    pathOf,
    form,
    onSubmit,
    submitting: create.isPending,
    rename: (id: string, name: string) => rename.mutate({ id, name }),
    remove: (id: string) => remove.mutate(id),
    error,
  }
}
