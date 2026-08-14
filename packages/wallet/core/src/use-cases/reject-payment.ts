import { AdminUseCase, AuthenticatedActor, EventPublisher, NotFoundError, Errors } from 'shared'
import { WalletRepository } from '../providers'

interface Input {
  paymentId: string
  // Mandatory for a withdrawal (Payment.reject enforces it), optional for a
  // deposit — see Payment.reject.
  reason?: string
}

/**
 * Admin rejects a pending payment. For a withdrawal it releases the previously
 * held funds back to `available` (atomically with the status change); a rejected
 * deposit simply never credited anything. Admin-only (AdminUseCase).
 */
export default class RejectPayment extends AdminUseCase<Input, void> {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {
    super()
  }

  protected async executeAsAdmin({ paymentId, reason }: Input, actor: AuthenticatedActor): Promise<void> {
    const payment = await this.walletRepository.findPaymentById(paymentId)
    if (!payment) NotFoundError.throwError(Errors.PAYMENT_NOT_FOUND, paymentId)

    payment.reject(actor.id, reason)

    // Releasing the hold of a rejected WITHDRAWAL happens INSIDE the
    // repository's transaction (see the port); a rejected deposit never
    // credited anything, so there is nothing to undo.
    await this.walletRepository.applyPaymentRejection(payment)
    await this.eventPublisher?.publish(payment.pullDomainEvents())
  }
}
