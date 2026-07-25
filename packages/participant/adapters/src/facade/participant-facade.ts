import { ParticipantRepository, ParticipantQueryRepository, ParticipantDTO } from '@participant/core'
import { AuthenticatedActor } from 'shared'
import {
  CreateParticipantController,
  UpdateParticipantController,
  DeleteParticipantController,
  ListParticipantsController,
} from '../controllers'
import { CreateParticipantInput, UpdateParticipantInput } from '../@types'

/**
 * Single entry point the backend (NestJS) calls. Optional ports in the
 * constructor; each method builds its controller. The admin actor (id + role)
 * comes from the JWT — the role is re-checked inside each admin use case.
 */
export default class ParticipantFacade {
  constructor(
    private readonly participantRepository?: ParticipantRepository,
    private readonly participantQueryRepository?: ParticipantQueryRepository,
  ) {}

  async createParticipant(input: CreateParticipantInput, actor: AuthenticatedActor): Promise<void> {
    await new CreateParticipantController(this.participantRepository!).execute(input, actor)
  }

  async updateParticipant(
    participantId: string,
    input: UpdateParticipantInput,
    actor: AuthenticatedActor,
  ): Promise<void> {
    await new UpdateParticipantController(this.participantRepository!).execute(
      participantId,
      input,
      actor,
    )
  }

  async deleteParticipant(
    participantId: string,
    isInUse: boolean,
    actor: AuthenticatedActor,
  ): Promise<void> {
    await new DeleteParticipantController(this.participantRepository!).execute(
      participantId,
      isInUse,
      actor,
    )
  }

  async listParticipants(): Promise<ParticipantDTO[]> {
    return new ListParticipantsController(this.participantQueryRepository!).execute()
  }
}
