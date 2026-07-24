import { DeleteCategory, CategoryRepository } from '@category/core'
import { AuthenticatedActor } from 'shared'

export default class DeleteCategoryController {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(categoryId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new DeleteCategory(this.categoryRepository)
    await useCase.execute({ categoryId }, actor)
  }
}
