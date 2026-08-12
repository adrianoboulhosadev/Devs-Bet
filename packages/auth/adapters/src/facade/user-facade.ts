import {
  UserRepository,
  UserQueryRepository,
  HashProvider,
  JwtProvider,
  JwtTokens,
  UserDTO,
  AuthSessionRepository,
  OAuthAccountRepository,
  GoogleTokenVerifier,
} from '@auth/core'
import { AuthenticatedActor } from 'shared'
import {
  RegisterUserController,
  LoginUserController,
  FindUserByIdController,
  ChangePasswordController,
  LogoutUserController,
  DeactivateUserController,
  RefreshTokenController,
  LoginWithGoogleController,
  UpdateProfileController,
  SetUserApprovalController,
  ListUsersController,
} from '../controllers'
import {
  RegisterUserInput,
  LoginUserInput,
  ChangePasswordInput,
  LoginWithGoogleInput,
  UpdateProfileInput,
  SetUserApprovalInput,
} from '../@types'

/**
 * Single entry point that the backend (NestJS) calls. Receives the driven
 * adapters through the constructor (optional ports) and delegates to each
 * controller. The backend only knows this facade — never the use cases or the
 * core directly.
 */
export default class UserFacade {
  constructor(
    private readonly userRepository?: UserRepository,
    private readonly userQueryRepository?: UserQueryRepository,
    private readonly hashProvider?: HashProvider,
    private readonly jwtProvider?: JwtProvider,
    private readonly sessionRepository?: AuthSessionRepository,
    private readonly oauthAccountRepository?: OAuthAccountRepository,
    private readonly googleVerifier?: GoogleTokenVerifier,
  ) {}

  async registerUser(input: RegisterUserInput): Promise<void> {
    const controller = new RegisterUserController(this.userRepository!, this.hashProvider!)
    await controller.execute(input)
  }

  async loginUser(input: LoginUserInput): Promise<JwtTokens> {
    const controller = new LoginUserController(
      this.userRepository!,
      this.hashProvider!,
      this.jwtProvider!,
      this.sessionRepository!,
    )
    return controller.execute(input)
  }

  async refreshToken(token: string, secret: string): Promise<JwtTokens> {
    const controller = new RefreshTokenController(
      this.jwtProvider!,
      this.sessionRepository!,
      this.hashProvider!,
      this.userRepository!,
    )
    return controller.execute(token, secret)
  }

  async findUser(id: string): Promise<Pick<UserDTO, 'id' | 'email' | 'role'>> {
    const controller = new FindUserByIdController(this.userQueryRepository!)
    return controller.execute(id)
  }

  async changePassword(input: ChangePasswordInput, userId: string): Promise<void> {
    const controller = new ChangePasswordController(this.userRepository!, this.hashProvider!)
    await controller.execute(input, userId)
  }

  async logoutUser(userId: string, refreshToken?: string): Promise<void> {
    const controller = new LogoutUserController(this.sessionRepository!, this.hashProvider!)
    await controller.execute(userId, refreshToken)
  }

  async deactivateUser(userId: string): Promise<void> {
    const controller = new DeactivateUserController(this.userRepository!)
    await controller.execute(userId)
  }

  async updateProfile(input: UpdateProfileInput, userId: string): Promise<void> {
    const controller = new UpdateProfileController(this.userRepository!)
    await controller.execute(input, userId)
  }

  // Admin-only (the AdminUseCase base re-checks the actor's role in the domain).
  async setUserApproval(input: SetUserApprovalInput, actor: AuthenticatedActor): Promise<void> {
    const controller = new SetUserApprovalController(this.userRepository!, this.sessionRepository!)
    await controller.execute(input, actor)
  }

  async listUsers(actor: AuthenticatedActor): Promise<UserDTO[]> {
    const controller = new ListUsersController(this.userQueryRepository!)
    return controller.execute(actor)
  }

  async loginWithGoogle(input: LoginWithGoogleInput): Promise<JwtTokens> {
    const controller = new LoginWithGoogleController(
      this.userRepository!,
      this.oauthAccountRepository!,
      this.googleVerifier!,
      this.hashProvider!,
      this.jwtProvider!,
      this.sessionRepository!,
    )
    return controller.execute(input)
  }
}
