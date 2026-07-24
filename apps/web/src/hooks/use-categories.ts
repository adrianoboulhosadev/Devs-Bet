'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CategoryDTO } from '@category/adapters'
import { api } from '@/lib/api'

export const CATEGORIES_KEY = ['categories']

/**
 * Shared access to the category tree (flat list). Exposes helpers to walk it:
 * children of a node and the "a / b / c" path of a node.
 */
export function useCategories() {
  const query = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async (): Promise<CategoryDTO[]> => (await api.get<CategoryDTO[]>('/category')).data,
  })

  const categories = useMemo(() => query.data ?? [], [query.data])
  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])

  const childrenOf = (parentId: string | null) =>
    categories.filter((category) => category.parentId === parentId)

  const pathOf = (id: string | null): string => {
    const names: string[] = []
    let current = id ? byId.get(id) : undefined
    while (current) {
      names.unshift(current.name)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return names.join(' / ')
  }

  return { categories, byId, loading: query.isLoading, childrenOf, pathOf }
}
