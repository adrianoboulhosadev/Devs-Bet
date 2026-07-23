import { AdminUseCase, AuthenticatedActor, NotFoundError, Errors } from 'shared'
import { Wallet, LedgerEntry } from '../model'
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
  constructor(private readonly walletRepository: WalletRepository) {
    super()
  }

  protected async executeAsAdmin({ paymentId }: Input, actor: AuthenticatedActor): Promise<void> {
    const payment = await this.walletRepository.findPaymentById(paymentId)
    if (!payment || payment.direction !== 'deposit') {
      NotFoundError.throwError(Errors.PAYMENT_NOT_FOUND, paymentId)
    }

    payment.confirm(actor.id)

    const wallet =
      (await this.walletRepository.findWalletByUserId(payment.userId)) ??
      new Wallet({ userId: payment.userId })
    wallet.deposit(payment.amount)

    const entry = new LedgerEntry({
      walletId: wallet.id.value,
      type: 'deposit',
      amount: payment.amount.cents,
      referenceId: payment.id.value,
    })

    await this.walletRepository.confirmDeposit(wallet, entry, payment)
  }
}
