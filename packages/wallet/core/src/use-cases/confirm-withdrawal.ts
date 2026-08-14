import { AdminUseCase, AuthenticatedActor, EventPublisher, NotFoundError, Errors } from 'shared'
import { WalletRepository } from '../providers'

interface Input {
  paymentId: string
  receiptUrl: string
}

/**
 * Admin marks a withdrawal as paid (money left the owner's account): settles the
 * hold (balance and held go down together) and writes the ledger entry, atomically
 * with the payment status change. Admin-only (AdminUseCase).
 */
export default class ConfirmWithdrawal extends AdminUseCase<Input, void> {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {
    super()
  }

  protected async executeAsAdmin({ paymentId, receiptUrl }: Input, actor: AuthenticatedActor): Promise<void> {
    const payment = await this.walletRepository.findPaymentById(paymentId)
    if (!payment || payment.direction !== 'withdrawal') {
      NotFoundError.throwError(Errors.PAYMENT_NOT_FOUND, paymentId)
    }

    payment.markPaid(actor.id, receiptUrl)

    // Settling the hold + writing the ledger entry happens INSIDE the
    // repository's transaction (see the port).
    await this.walletRepository.applyWithdrawalConfirmation(payment)
    await this.eventPublisher?.publish(payment.pullDomainEvents())
  }
}
