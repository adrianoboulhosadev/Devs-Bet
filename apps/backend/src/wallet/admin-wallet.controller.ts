import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { PaymentDTO, WalletFacade } from '@wallet/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor } from 'shared'
import { PrismaWalletRepository } from './prisma-wallet-repository'
import { NotificationDispatcher } from '../notification/notification.dispatcher'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'

// Admin-only wallet routes: confirm deposits, pay/reject withdrawals, list pending.
// AuthMiddleware resolves req.user (see wallet.module); AdminGuard enforces the
// role at the edge; the AdminUseCase re-checks it in the domain.
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminWalletController {
  constructor(
    private readonly walletRepository: PrismaWalletRepository,
    private readonly notifications: NotificationDispatcher,
  ) {}

  private facade(): WalletFacade {
    return new WalletFacade(this.walletRepository, undefined, this.walletRepository)
  }

  private actor(user: UserDTO): AuthenticatedActor {
    return { id: user.id, role: user.role }
  }

  @Get('payments')
  pending(@authenticatedUser() user: UserDTO): Promise<PaymentDTO[]> {
    return this.facade().listPendingPayments(this.actor(user))
  }

  @Post('deposits/:id/confirm')
  @HttpCode(204)
  async confirmDeposit(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().confirmDeposit(id, this.actor(user))

    // Told to the user only after the money actually moved. Reading the payment
    // back (its own repository, already injected) is how we learn WHO to tell —
    // the command itself returns void, as every command here does.
    const payment = await this.walletRepository.findPaymentById(id)
    if (payment) {
      await this.notifications.notify([
        {
          userId: payment.userId,
          type: 'deposit_confirmed',
          amount: payment.amount.cents,
          referenceId: payment.id.value,
        },
      ])
    }
  }

  @Post('withdrawals/:id/confirm')
  @HttpCode(204)
  async confirmWithdrawal(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().confirmWithdrawal(id, this.actor(user))

    const payment = await this.walletRepository.findPaymentById(id)
    if (payment) {
      await this.notifications.notify([
        {
          userId: payment.userId,
          type: 'withdrawal_paid',
          amount: payment.amount.cents,
          referenceId: payment.id.value,
        },
      ])
    }
  }

  @Post('payments/:id/reject')
  @HttpCode(204)
  async reject(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().rejectPayment(id, this.actor(user))

    // One route rejects both directions, so the payment itself says which
    // message the user gets.
    const payment = await this.walletRepository.findPaymentById(id)
    if (payment) {
      await this.notifications.notify([
        {
          userId: payment.userId,
          type: payment.direction === 'deposit' ? 'deposit_rejected' : 'withdrawal_rejected',
          amount: payment.amount.cents,
          referenceId: payment.id.value,
        },
      ])
    }
  }
}
