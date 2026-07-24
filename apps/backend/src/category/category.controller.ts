import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  CategoryFacade,
  CategoryDTO,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@category/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor } from 'shared'
import { PrismaCategoryRepository } from './prisma-category-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'

// Protected by the AuthMiddleware (see category.module). Listing is open to any
// authenticated user (needed to pick a category for a match); create/rename/delete
// are admin-only (AdminGuard at the edge + AdminUseCase in the domain).
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryRepository: PrismaCategoryRepository) {}

  private facade(): CategoryFacade {
    return new CategoryFacade(this.categoryRepository, this.categoryRepository)
  }

  private actor(user: UserDTO): AuthenticatedActor {
    return { id: user.id, role: user.role }
  }

  @Get()
  list(): Promise<CategoryDTO[]> {
    return this.facade().listCategories()
  }

  @Post()
  @HttpCode(201)
  @UseGuards(AdminGuard)
  async create(@Body() input: CreateCategoryInput, @authenticatedUser() user: UserDTO) {
    await this.facade().createCategory(input, this.actor(user))
  }

  @Patch(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() input: UpdateCategoryInput,
    @authenticatedUser() user: UserDTO,
  ) {
    await this.facade().updateCategory(id, input, this.actor(user))
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().deleteCategory(id, this.actor(user))
  }
}
