import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { ConfirmWithdrawalInput, PaymentDTO, RejectPaymentInput, WalletFacade } from '@wallet/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor } from 'shared'
import { PrismaWalletRepository } from './prisma-wallet-repository'
import { DomainEventListener } from '../notification/domain-event-listener'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'

// Admin-only wallet routes: confirm deposits, pay/reject withdrawals, list pending.
// AuthMiddleware resolves req.user (see wallet.module); AdminGuard enforces the
// role at the edge; the AdminUseCase re-checks it in the domain.
//
// Notifications are NOT built here: each money move records a domain event
// (Payment.confirm/markPaid/reject) and the use case publishes it — the
// DomainEventListener decides what to tell whom. That is why these routes went
// back to one line each.
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminWalletController {
  constructor(
    private readonly walletRepository: PrismaWalletRepository,
    private readonly events: DomainEventListener,
  ) {}

  private facade(): WalletFacade {
    return new WalletFacade(
      this.walletRepository,
      undefined,
      this.walletRepository,
      undefined,
      undefined,
      this.events,
    )
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
  }

  @Post('withdrawals/:id/confirm')
  @HttpCode(204)
  async confirmWithdrawal(
    @Param('id') id: string,
    @Body() input: ConfirmWithdrawalInput,
    @authenticatedUser() user: UserDTO,
  ) {
    await this.facade().confirmWithdrawal(id, input, this.actor(user))
  }

  @Post('payments/:id/reject')
  @HttpCode(204)
  async reject(
    @Param('id') id: string,
    @Body() input: RejectPaymentInput,
    @authenticatedUser() user: UserDTO,
  ) {
    await this.facade().rejectPayment(id, input, this.actor(user))
  }
}
