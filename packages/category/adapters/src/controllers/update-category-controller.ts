import { UpdateCategory, CategoryRepository } from '@category/core'
import { AuthenticatedActor } from 'shared'
import { UpdateCategoryInput } from '../@types'

export default class UpdateCategoryController {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(
    categoryId: string,
    input: UpdateCategoryInput,
    actor: AuthenticatedActor,
  ): Promise<void> {
    const useCase = new UpdateCategory(this.categoryRepository)
    await useCase.execute({ categoryId, name: input.name }, actor)
  }
}
