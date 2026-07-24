import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import {
  DepositInput,
  WithdrawalInput,
  SetDepositLimitInput,
  WalletDTO,
  PaymentDTO,
  DepositInstructions,
  DepositLimitDTO,
  WalletFacade,
} from '@wallet/adapters'
import { UserDTO } from '@auth/adapters'
import { PrismaWalletRepository } from './prisma-wallet-repository'
import { ManualPaymentGateway } from './manual-payment-gateway'
import { authenticatedUser } from '../shared/authenticated-user.decorator'

// User-facing wallet routes. Protected by the AuthMiddleware (see wallet.module).
// The userId ALWAYS comes from the token (anti-IDOR), never the body.
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletRepository: PrismaWalletRepository,
    private readonly paymentGateway: ManualPaymentGateway,
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
  }

  @Post('withdraw')
  @HttpCode(201)
  async withdraw(@Body() input: WithdrawalInput, @authenticatedUser() user: UserDTO) {
    await this.facade().requestWithdrawal(input, user.id)
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
}
