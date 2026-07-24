'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CategoryDTO } from '@category/adapters'

interface CategoryPickerProps {
  categories: CategoryDTO[]
  // Currently selected LEAF id (or null while the drill-down is incomplete).
  value: string | null
  onChange: (leafId: string | null) => void
}

/**
 * Cascading selects that drill down the category tree. Each level shows the
 * children of the level above; onChange only fires a value once a LEAF is
 * reached (null while an intermediate node is selected). Mirrors the tree the
 * admin built (e.g. games → e-sports → Counter Strike).
 */
export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
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

  const selectAt = (level: number, id: string) => {
    const chain = selected.slice(0, level)
    if (id) chain.push(id)
    setSelected(chain)
    const isLeaf = id ? childrenOf(id).length === 0 : false
    onChange(isLeaf ? id : null)
  }

  // Levels to render: roots, then children of each chosen node (while they exist).
  const levels: CategoryDTO[][] = [childrenOf(null)]
  for (const id of selected) {
    const children = childrenOf(id)
    if (children.length) levels.push(children)
  }

  return (
    <div className="space-y-2">
      {levels.map((options, level) => (
        <select
          key={level}
          value={selected[level] ?? ''}
          onChange={(event) => selectAt(level, event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        >
          <option value="">{level === 0 ? 'Categoria…' : 'Selecione…'}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.isLeaf ? '' : ' ›'}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}
