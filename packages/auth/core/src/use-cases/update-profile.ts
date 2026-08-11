import { UseCase, NotFoundError, Errors } from 'shared'
import { UserRepository } from '../providers'

interface Input {
  userId: string
  nickname?: string | null
  avatarUrl?: string | null
}

/**
 * Display-only edit (nickname/avatar) — never touches email/password/role.
 * Anti-IDOR lives at the HTTP boundary: the backend only calls this with the
 * authenticated userId.
 */
export default class UpdateProfile implements UseCase<Input, void> {
  constructor(private readonly repository: UserRepository) {}

  async execute(input: Input): Promise<void> {
    const { userId, nickname, avatarUrl } = input

    const user = await this.repository.findById(userId)
    if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND)

    user.editProfile({ nickname, avatarUrl })
    await this.repository.updateProfile(userId, { nickname: user.nickname, avatarUrl: user.avatarUrl })
  }
}
