export interface CreateCategoryInput {
  name: string
  // null/absent = root category.
  parentId?: string | null
}

export interface UpdateCategoryInput {
  name: string
}
