'use client'

import type { CategoryDTO } from '@category/adapters'
import { useCategoryPicker } from './hooks/use-category-picker'

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
  const { selected, levels, selectAt } = useCategoryPicker({ categories, value, onChange })

  return (
    <div className="space-y-2">
      {levels.map((options, level) => (
        <select
          key={level}
          value={selected[level] ?? ''}
          onChange={(event) => selectAt(level, event.target.value)}
          className="w-full border-3 border-arcade-border bg-[#0b0714] px-3 py-2.5 font-arcade text-xl text-arcade-text outline-none focus:border-arcade-cyan"
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
