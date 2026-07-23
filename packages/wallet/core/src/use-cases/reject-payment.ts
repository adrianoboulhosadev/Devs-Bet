import { AdminUseCase, AuthenticatedActor, NotFoundError, Errors } from 'shared'
import { Wallet } from '../model'
import { WalletRepository } from '../providers'

interface Input {
  paymentId: string
}

/**
 * Admin rejects a pending payment. For a withdrawal it releases the previously
 * held funds back to `available` (atomically with the status change); a rejected
 * deposit simply never credited anything. Admin-only (AdminUseCase).
 */
export default class RejectPayment extends AdminUseCase<Input, void> {
  constructor(private readonly walletRepository: WalletRepository) {
    super()
  }

  protected async executeAsAdmin({ paymentId }: Input, actor: AuthenticatedActor): Promise<void> {
    const payment = await this.walletRepository.findPaymentById(paymentId)
    if (!payment) NotFoundError.throwError(Errors.PAYMENT_NOT_FOUND, paymentId)

    payment.reject(actor.id)

    let wallet: Wallet | null = null
    if (payment.direction === 'withdrawal') {
      wallet = await this.walletRepository.findWalletByUserId(payment.userId)
      if (wallet) wallet.release(payment.amount)
    }

    await this.walletRepository.rejectPayment(payment, wallet)
  }
}
