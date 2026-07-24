import { CreateCategory, CategoryRepository } from '@category/core'
import { AuthenticatedActor } from 'shared'
import { CreateCategoryInput } from '../@types'

export default class CreateCategoryController {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(input: CreateCategoryInput, actor: AuthenticatedActor): Promise<void> {
    const useCase = new CreateCategory(this.categoryRepository)
    await useCase.execute({ name: input.name, parentId: input.parentId }, actor)
  }
}
