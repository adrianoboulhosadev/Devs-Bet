'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CategoryDTO } from '@category/adapters'

interface UseCategoryPickerInput {
  categories: CategoryDTO[]
  value: string | null
  onChange: (leafId: string | null) => void
}

export function useCategoryPicker({ categories, value, onChange }: UseCategoryPickerInput) {
  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const childrenOf = (parentId: string | null) =>
    categories.filter((category) => category.parentId === parentId)

  // Chain of chosen ids, one per level. Seeded from `value` (e.g. edit prefill).
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    if (!value) return
    const chain: string[] = []
    let current = byId.get(value)
    while (current) {
      chain.unshift(current.id)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    setSelected(chain)
    // Only re-seed when the incoming value or the tree changes.
  }, [value, byId])

  // Levels to render: roots, then children of each chosen node (while they exist).
  const levels: CategoryDTO[][] = [childrenOf(null)]
  for (const id of selected) {
    const children = childrenOf(id)
    if (children.length) levels.push(children)
  }

  return {
    selected,
    levels,
    selectAt: (level: number, id: string) => {
      const chain = selected.slice(0, level)
      if (id) chain.push(id)
      setSelected(chain)
      const isLeaf = id ? childrenOf(id).length === 0 : false
      onChange(isLeaf ? id : null)
    },
  }
}
