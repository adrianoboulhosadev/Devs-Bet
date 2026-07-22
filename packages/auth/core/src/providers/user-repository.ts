import { User } from '../model'

/** User WRITE port (command side of CQRS). Trades the rich `User` entity. */
export interface UserRepository {
  register(user: User): Promise<void>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  changePassword(id: string, password: string): Promise<void>
  updateLastLogin(id: string): Promise<void>
  deactivate(id: string): Promise<void>
  // Hard delete of the identity (right to erasure). Distinct from `deactivate`
  // (soft): the row ceases to exist. The cross-context cascade (wallet, matches,
  // bets, sessions) is orchestrated in the backend.
  delete(id: string): Promise<void>
}
