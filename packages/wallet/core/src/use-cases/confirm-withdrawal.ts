import { AdminUseCase, AuthenticatedActor, NotFoundError, Errors } from 'shared'
import { LedgerEntry } from '../model'
import { WalletRepository } from '../providers'

interface Input {
  paymentId: string
}

/**
 * Admin marks a withdrawal as paid (money left the owner's account): settles the
 * hold (balance and held go down together) and writes the ledger entry, atomically
 * with the payment status change. Admin-only (AdminUseCase).
 */
export default class ConfirmWithdrawal extends AdminUseCase<Input, void> {
  constructor(private readonly walletRepository: WalletRepository) {
    super()
  }

  protected async executeAsAdmin({ paymentId }: Input, actor: AuthenticatedActor): Promise<void> {
    const payment = await this.walletRepository.findPaymentById(paymentId)
    if (!payment || payment.direction !== 'withdrawal') {
      NotFoundError.throwError(Errors.PAYMENT_NOT_FOUND, paymentId)
    }

    payment.markPaid(actor.id)

    const wallet = await this.walletRepository.findWalletByUserId(payment.userId)
    if (!wallet) NotFoundError.throwError(Errors.WALLET_NOT_FOUND, payment.userId)

    wallet.settleHold(payment.amount)

    const entry = new LedgerEntry({
      walletId: wallet.id.value,
      type: 'withdrawal',
      amount: payment.amount.cents,
      referenceId: payment.id.value,
    })

    await this.walletRepository.confirmWithdrawal(wallet, entry, payment)
  }
}
