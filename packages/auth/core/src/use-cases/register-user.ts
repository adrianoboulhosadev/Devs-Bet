import { UseCase, ConflictError, Errors } from 'shared'
import { Email, StrongPassword, PasswordHash, User } from '../model'
import { UserRepository, HashProvider } from '../providers'

interface Input {
  email: string
  password: string
}

/**
 * Creates the User (identity). The rules live in the value objects: Email
 * validates/normalizes the address, StrongPassword enforces the policy. The
 * use case only orchestrates: build the VOs, dedup, hash and persist. Wallet
 * creation is a cross-context concern orchestrated in the backend.
 */
export default class RegisterUser implements UseCase<Input, void> {
  constructor(
    private readonly repository: UserRepository,
    private readonly hash: HashProvider,
  ) {}

  async execute(input: Input): Promise<void> {
    const email = new Email(input.email)
    const password = new StrongPassword(input.password)

    const alreadyExists = await this.repository.findByEmail(email.value)
    if (alreadyExists) ConflictError.throwError(Errors.USER_ALREADY_EXISTS, email.value)

    const passwordHash = new PasswordHash(this.hash.hash(password.value))
    const user = new User({ email: email.value, password: passwordHash.value })

    await this.repository.register(user)
  }
}
