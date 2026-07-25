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
  ParticipantFacade,
  ParticipantDTO,
  CreateParticipantInput,
  UpdateParticipantInput,
} from '@participant/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor } from 'shared'
import { PrismaParticipantRepository } from './prisma-participant-repository'
import { PrismaService } from '../db/prisma.service'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'

// Protected by the AuthMiddleware (see participant.module). Listing is open to
// any authenticated user (needed to populate the picker when creating a
// match/tournament); create/update/delete are admin-only.
@Controller('participant')
export class ParticipantController {
  constructor(
    private readonly participantRepository: PrismaParticipantRepository,
    private readonly prisma: PrismaService,
  ) {}

  private facade(): ParticipantFacade {
    return new ParticipantFacade(this.participantRepository, this.participantRepository)
  }

  private actor(user: UserDTO): AuthenticatedActor {
    return { id: user.id, role: user.role }
  }

  // Cross-context: a participant already picked into a match or tournament
  // cannot be removed from the catalog (see DeleteParticipant/PARTICIPANT_IN_USE).
  // participant never imports match/tournament, so this check lives here.
  private async isInUse(participantId: string): Promise<boolean> {
    const [matchUsage, tournamentUsage] = await Promise.all([
      this.prisma.matchParticipant.count({ where: { participantId } }),
      this.prisma.tournamentParticipant.count({ where: { participantId } }),
    ])
    return matchUsage + tournamentUsage > 0
  }

  @Get()
  list(): Promise<ParticipantDTO[]> {
    return this.facade().listParticipants()
  }

  @Post()
  @HttpCode(201)
  @UseGuards(AdminGuard)
  async create(@Body() input: CreateParticipantInput, @authenticatedUser() user: UserDTO) {
    await this.facade().createParticipant(input, this.actor(user))
  }

  @Patch(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() input: UpdateParticipantInput,
    @authenticatedUser() user: UserDTO,
  ) {
    await this.facade().updateParticipant(id, input, this.actor(user))
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    const isInUse = await this.isInUse(id)
    await this.facade().deleteParticipant(id, isInUse, this.actor(user))
  }
}
