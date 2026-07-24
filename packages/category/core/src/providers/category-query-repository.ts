import { CategoryDTO } from '../model'

/** Category READ port. `listQuery` returns the whole tree flat (each node with
 * its parentId + isLeaf) so the front can render/drill down the hierarchy. */
export interface CategoryQueryRepository {
  listQuery(): Promise<CategoryDTO[]>
  findByIdQuery(id: string): Promise<CategoryDTO | null>
}
