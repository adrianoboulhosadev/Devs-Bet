import { UseCase, EventPublisher, Money, ValidationError, Errors, Id } from 'shared'
import { Payment, WithdrawalRequested } from '../model'
import { WalletRepository } from '../providers'

interface Input {
  userId: string
  amount: number // cents
}

/**
 * Opens a pending withdrawal: reserves (holds) the funds so they cannot be spent
 * while the payout is pending, and records the request. The admin later pays it
 * out (settling the hold) or rejects it (releasing the hold).
 */
export default class RequestWithdrawal implements UseCase<Input, void> {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute({ userId, amount }: Input): Promise<void> {
    const value = new Money(amount)
    if (value.isZero()) ValidationError.throwError(Errors.INVALID_AMOUNT, amount)

    const payment = new Payment({
      userId,
      direction: 'withdrawal',
      amount,
      referenceCode: 'WTH-' + Id.create().replace(/-/g, '').slice(0, 10).toUpperCase(),
    })

    // The hold happens INSIDE the repository's transaction (see the port): it
    // loads the wallet there and calls `wallet.hold`, which is what raises
    // INSUFFICIENT_BALANCE when the funds are not available.
    await this.walletRepository.holdForWithdrawal(payment)
    await this.eventPublisher?.publish([new WithdrawalRequested(payment.id.value, userId, amount)])
  }
}
