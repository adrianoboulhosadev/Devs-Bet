import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { PaymentDTO, WalletFacade } from '@wallet/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor } from 'shared'
import { PrismaWalletRepository } from './prisma-wallet-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'

// Admin-only wallet routes: confirm deposits, pay/reject withdrawals, list pending.
// AuthMiddleware resolves req.user (see wallet.module); AdminGuard enforces the
// role at the edge; the AdminUseCase re-checks it in the domain.
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminWalletController {
  constructor(private readonly walletRepository: PrismaWalletRepository) {}

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
  }

  @Post('withdrawals/:id/confirm')
  @HttpCode(204)
  async confirmWithdrawal(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().confirmWithdrawal(id, this.actor(user))
  }

  @Post('payments/:id/reject')
  @HttpCode(204)
  async reject(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().rejectPayment(id, this.actor(user))
  }
}
