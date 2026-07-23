import { CreateMatch, MatchRepository } from '@match/core'
import { CreateMatchInput } from '../@types'

export default class CreateMatchController {
  constructor(private readonly matchRepository: MatchRepository) {}

  // creatorId comes from the JWT (HTTP boundary).
  async execute(input: CreateMatchInput, creatorId: string): Promise<void> {
    const useCase = new CreateMatch(this.matchRepository)
    await useCase.execute({ creatorId, ...input })
  }
}
