import { CreateMatch, MatchRepository } from '@match/core'
import { AuthenticatedActor } from 'shared'
import { CreateMatchInput } from '../@types'

export default class CreateMatchController {
  constructor(private readonly matchRepository: MatchRepository) {}

  // The actor (id + role) comes from the JWT; the admin role is re-checked
  // inside the use case (AdminUseCase).
  async execute(input: CreateMatchInput, actor: AuthenticatedActor): Promise<void> {
    const useCase = new CreateMatch(this.matchRepository)
    await useCase.execute(input, actor)
  }
}
