export type Role = 'user' | 'admin'

/**
 * Minimal shape of the authenticated caller the DOMAIN needs for authorization.
 * Kept context-free (only id + role) on purpose, so the `shared` kernel never
 * depends on the auth context. The backend resolves the full user from the JWT
 * and passes this down into role-guarded use cases (see AdminUseCase).
 */
export interface AuthenticatedActor {
  id: string
  role: Role
}
