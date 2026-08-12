import { UserDTO } from '../model'

/** User READ port (query side of CQRS). */
export interface UserQueryRepository {
  findByIdQuery(id: string): Promise<UserDTO | null>
  // Every account, newest first — the admin's sign-up queue (see ListUsersQuery).
  listUsersQuery(): Promise<UserDTO[]>
}
