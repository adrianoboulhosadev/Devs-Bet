import { AdminUseCase, AuthenticatedActor, EventPublisher, NotFoundError, Errors } from 'shared'
import { WalletRepository } from '../providers'

interface Input {
  paymentId: string
}

/**
 * Admin confirms a Pix deposit was received: credits the user's wallet and writes
 * the ledger entry, atomically with the payment status change. The wallet is
 * provisioned lazily on the first deposit. Admin-only (AdminUseCase).
 */
export default class ConfirmDeposit extends AdminUseCase<Input, void> {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {
    super()
  }

  protected async executeAsAdmin({ paymentId }: Input, actor: AuthenticatedActor): Promise<void> {
    const payment = await this.walletRepository.findPaymentById(paymentId)
    if (!payment || payment.direction !== 'deposit') {
      NotFoundError.throwError(Errors.PAYMENT_NOT_FOUND, paymentId)
    }

    payment.confirm(actor.id)

    // Crediting the wallet + writing the ledger entry happens INSIDE the
    // repository's transaction (see the port), which also provisions the wallet
    // when this is the user's first deposit.
    await this.walletRepository.applyDepositConfirmation(payment)
    await this.eventPublisher?.publish(payment.pullDomainEvents())
  }
}
