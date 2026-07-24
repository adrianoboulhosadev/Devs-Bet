import { AuthenticatedActor, AccessDeniedError, ValidationError, ConflictError, Errors } from 'shared'
import {
  Category,
  CreateCategory,
  UpdateCategory,
  DeleteCategory,
  ListCategoriesQuery,
} from '../src'
import { CategoryRepositoryInMemory } from './in-memory'

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }
const user: AuthenticatedActor = { id: 'user-1', role: 'user' }

test('Category requires a name', () => {
  expect(() => new Category({ name: '  ' })).toThrow(ValidationError)
})

test('admin builds a tree: games -> e-sports -> Counter Strike', async () => {
  const repository = new CategoryRepositoryInMemory()
  await new CreateCategory(repository).execute({ name: 'games' }, admin)
  const games = repository.categories[0].id
  await new CreateCategory(repository).execute({ name: 'e-sports', parentId: games }, admin)
  const esports = repository.categories[1].id
  await new CreateCategory(repository).execute({ name: 'Counter Strike', parentId: esports }, admin)

  const all = await new ListCategoriesQuery(repository).execute()
  expect(all).toHaveLength(3)
  const byName = (name: string) => all.find((category) => category.name === name)!
  // only the deepest node is a leaf; intermediate nodes are not
  expect(byName('games').isLeaf).toBe(false)
  expect(byName('e-sports').isLeaf).toBe(false)
  expect(byName('Counter Strike').isLeaf).toBe(true)
})

test('a non-admin cannot create a category (NOT_ADMIN)', async () => {
  const repository = new CategoryRepositoryInMemory()
  const create = new CreateCategory(repository).execute({ name: 'games' }, user)
  await expect(create).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(create).rejects.toMatchObject({ code: Errors.NOT_ADMIN })
})

test('creating under a missing parent fails (CATEGORY_NOT_FOUND)', async () => {
  const repository = new CategoryRepositoryInMemory()
  const create = new CreateCategory(repository).execute({ name: 'x', parentId: 'ghost' }, admin)
  await expect(create).rejects.toMatchObject({ code: Errors.CATEGORY_NOT_FOUND })
})

test('duplicate name under the same parent is rejected (CATEGORY_ALREADY_EXISTS)', async () => {
  const repository = new CategoryRepositoryInMemory()
  await new CreateCategory(repository).execute({ name: 'games' }, admin)
  const dup = new CreateCategory(repository).execute({ name: 'games' }, admin)
  await expect(dup).rejects.toMatchObject({ code: Errors.CATEGORY_ALREADY_EXISTS })
})

test('same name under different parents is allowed', async () => {
  const repository = new CategoryRepositoryInMemory()
  await new CreateCategory(repository).execute({ name: 'games' }, admin)
  await new CreateCategory(repository).execute({ name: 'luta' }, admin)
  const games = repository.categories[0].id
  const luta = repository.categories[1].id
  await new CreateCategory(repository).execute({ name: 'final', parentId: games }, admin)
  await new CreateCategory(repository).execute({ name: 'final', parentId: luta }, admin)
  expect(repository.categories).toHaveLength(4)
})

test('rename keeps uniqueness among siblings', async () => {
  const repository = new CategoryRepositoryInMemory()
  await new CreateCategory(repository).execute({ name: 'games' }, admin)
  await new CreateCategory(repository).execute({ name: 'sports' }, admin)
  const sports = repository.categories[1].id
  const clash = new UpdateCategory(repository).execute({ categoryId: sports, name: 'games' }, admin)
  await expect(clash).rejects.toMatchObject({ code: Errors.CATEGORY_ALREADY_EXISTS })
})

test('cannot delete a category that has children (CATEGORY_HAS_CHILDREN)', async () => {
  const repository = new CategoryRepositoryInMemory()
  await new CreateCategory(repository).execute({ name: 'games' }, admin)
  const games = repository.categories[0].id
  await new CreateCategory(repository).execute({ name: 'e-sports', parentId: games }, admin)

  const remove = new DeleteCategory(repository).execute({ categoryId: games }, admin)
  await expect(remove).rejects.toBeInstanceOf(ConflictError)
  await expect(remove).rejects.toMatchObject({ code: Errors.CATEGORY_HAS_CHILDREN })
})

test('deleting a leaf works', async () => {
  const repository = new CategoryRepositoryInMemory()
  await new CreateCategory(repository).execute({ name: 'games' }, admin)
  const games = repository.categories[0].id
  await new DeleteCategory(repository).execute({ categoryId: games }, admin)
  expect(repository.categories).toHaveLength(0)
})
