import { Entity, EntityProps, ValidationError, Errors } from 'shared'

export interface CategoryProps extends EntityProps {
  name?: string
  // Parent node in the tree; null/absent = a root category. Not editable after
  // creation (moving nodes is out of scope) — only the name can change.
  parentId?: string | null
}

/**
 * Rich category node of a self-referential tree (e.g. games → e-sports →
 * Counter Strike). A match references a LEAF; whether a node is a leaf is a
 * read-model concern (computed by the query side), so it is not stored here.
 */
export class Category extends Entity<Category, CategoryProps> {
  name: string
  readonly parentId: string | null

  constructor(props: CategoryProps) {
    super(props)
    const name = props.name?.trim() ?? ''
    if (!name) ValidationError.throwError(Errors.REQUIRED_FIELD, 'name')

    this.name = name
    this.parentId = props.parentId ?? null
  }

  rename(name: string): void {
    const trimmed = name.trim()
    if (!trimmed) ValidationError.throwError(Errors.REQUIRED_FIELD, 'name')
    this.name = trimmed
  }
}
