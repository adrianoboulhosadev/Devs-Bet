import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import {
  DepositInput,
  WithdrawalInput,
  SetDepositLimitInput,
  StartSelfExclusionInput,
  WalletDTO,
  PaymentDTO,
  DepositInstructions,
  DepositLimitDTO,
  SelfExclusionDTO,
  WalletFacade,
} from '@wallet/adapters'
import { UserDTO } from '@auth/adapters'
import { NotificationInput } from '@notification/adapters'
import { PrismaWalletRepository } from './prisma-wallet-repository'
import { ManualPaymentGateway } from './manual-payment-gateway'
import { PrismaUserRepository } from '../auth/prisma-user-repository'
import { NotificationDispatcher } from '../notification/notification.dispatcher'
import { authenticatedUser } from '../shared/authenticated-user.decorator'

/** How a requester is named to the admin. The nickname when there is one, else
 * a TRUNCATED id — the same choice the payments panel already makes, so a
 * pending-payment alert never carries someone's e-mail around. */
function bettorLabel(user: UserDTO): string {
  return user.nickname?.trim() || user.id.slice(0, 8)
}

// User-facing wallet routes. Protected by the AuthMiddleware (see wallet.module).
// The userId ALWAYS comes from the token (anti-IDOR), never the body.
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletRepository: PrismaWalletRepository,
    private readonly paymentGateway: ManualPaymentGateway,
    private readonly userRepository: PrismaUserRepository,
    private readonly notifications: NotificationDispatcher,
  ) {}

  // PrismaWalletRepository serves write + every query port (payments + deposit limits).
  private facade(): WalletFacade {
    return new WalletFacade(
      this.walletRepository,
      this.walletRepository,
      this.walletRepository,
      this.paymentGateway,
      this.walletRepository,
    )
  }

  @Get('me')
  me(@authenticatedUser() user: UserDTO): Promise<WalletDTO> {
    return this.facade().getMyWallet(user.id)
  }

  @Get('deposit-instructions')
  depositInstructions(): DepositInstructions {
    return this.facade().depositInstructions()
  }

  @Get('payments')
  payments(@authenticatedUser() user: UserDTO): Promise<PaymentDTO[]> {
    return this.facade().listMyPayments(user.id)
  }

  @Post('deposit')
  @HttpCode(201)
  async deposit(@Body() input: DepositInput, @authenticatedUser() user: UserDTO) {
    await this.facade().requestDeposit(input, user.id)
    await this.alertAdmins((adminId) => ({
      userId: adminId,
      type: 'admin_deposit_pending',
      bettorLabel: bettorLabel(user),
      amount: input.amount,
    }))
  }

  @Post('withdraw')
  @HttpCode(201)
  async withdraw(@Body() input: WithdrawalInput, @authenticatedUser() user: UserDTO) {
    await this.facade().requestWithdrawal(input, user.id)
    await this.alertAdmins((adminId) => ({
      userId: adminId,
      type: 'admin_withdrawal_pending',
      bettorLabel: bettorLabel(user),
      amount: input.amount,
    }))
  }

  /**
   * Puts the new request in every admin's inbox — until now the only way to
   * learn about it was opening the control room.
   *
   * No `referenceId`: the command returns void (CQRS), so the payment's id is
   * not in hand here, and each request genuinely IS a separate event that
   * deserves its own line (null never collides in the unique index).
   */
  private async alertAdmins(build: (adminId: string) => NotificationInput): Promise<void> {
    const adminIds = await this.userRepository.findAdminIds()
    await this.notifications.notifyAdmins(adminIds, build)
  }

  @Get('deposit-limits')
  depositLimits(@authenticatedUser() user: UserDTO): Promise<DepositLimitDTO[]> {
    return this.facade().listMyDepositLimits(user.id)
  }

  @Post('deposit-limits')
  @HttpCode(201)
  async setDepositLimit(@Body() input: SetDepositLimitInput, @authenticatedUser() user: UserDTO) {
    await this.facade().setDepositLimit(input, user.id)
  }

  @Get('self-exclusion')
  selfExclusion(@authenticatedUser() user: UserDTO): Promise<SelfExclusionDTO | null> {
    return this.facade().getMySelfExclusion(user.id)
  }

  @Post('self-exclusion')
  @HttpCode(201)
  async startSelfExclusion(@Body() input: StartSelfExclusionInput, @authenticatedUser() user: UserDTO) {
    await this.facade().startSelfExclusion(input, user.id)
  }
}
