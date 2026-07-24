import { ListCategoriesQuery, CategoryQueryRepository, CategoryDTO } from '@category/core'

export default class ListCategoriesController {
  constructor(private readonly categoryQueryRepository: CategoryQueryRepository) {}

  async execute(): Promise<CategoryDTO[]> {
    return new ListCategoriesQuery(this.categoryQueryRepository).execute()
  }
}
