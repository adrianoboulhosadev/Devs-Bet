import { UseCase } from 'shared'
import { CategoryDTO } from '../model'
import { CategoryQueryRepository } from '../providers'

/** Lists the whole category tree (flat, each node with parentId + isLeaf). Open
 * to any authenticated user (needed to pick a category when creating a match). */
export default class ListCategoriesQuery implements UseCase<void, CategoryDTO[]> {
  constructor(private readonly categoryQueryRepository: CategoryQueryRepository) {}

  async execute(): Promise<CategoryDTO[]> {
    return this.categoryQueryRepository.listQuery()
  }
}
