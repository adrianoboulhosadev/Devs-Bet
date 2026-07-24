import { CategoryRepository, CategoryQueryRepository, CategoryDTO } from '@category/core'
import { AuthenticatedActor } from 'shared'
import {
  CreateCategoryController,
  UpdateCategoryController,
  DeleteCategoryController,
  ListCategoriesController,
} from '../controllers'
import { CreateCategoryInput, UpdateCategoryInput } from '../@types'

/**
 * Single entry point the backend (NestJS) calls. Optional ports in the
 * constructor; each method builds its controller. The admin actor (id + role)
 * comes from the JWT — the role is re-checked inside each admin use case.
 */
export default class CategoryFacade {
  constructor(
    private readonly categoryRepository?: CategoryRepository,
    private readonly categoryQueryRepository?: CategoryQueryRepository,
  ) {}

  async createCategory(input: CreateCategoryInput, actor: AuthenticatedActor): Promise<void> {
    await new CreateCategoryController(this.categoryRepository!).execute(input, actor)
  }

  async updateCategory(
    categoryId: string,
    input: UpdateCategoryInput,
    actor: AuthenticatedActor,
  ): Promise<void> {
    await new UpdateCategoryController(this.categoryRepository!).execute(categoryId, input, actor)
  }

  async deleteCategory(categoryId: string, actor: AuthenticatedActor): Promise<void> {
    await new DeleteCategoryController(this.categoryRepository!).execute(categoryId, actor)
  }

  async listCategories(): Promise<CategoryDTO[]> {
    return new ListCategoriesController(this.categoryQueryRepository!).execute()
  }
}
