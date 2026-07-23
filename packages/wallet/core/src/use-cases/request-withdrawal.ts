import { UseCase, Money, ValidationError, Errors, Id } from 'shared'
import { Payment } from '../model'
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
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute({ userId, amount }: Input): Promise<void> {
    const value = new Money(amount)
    if (value.isZero()) ValidationError.throwError(Errors.INVALID_AMOUNT, amount)

    const wallet = await this.walletRepository.findWalletByUserId(userId)
    if (!wallet) ValidationError.throwError(Errors.INSUFFICIENT_BALANCE, amount)

    wallet.hold(value) // raises INSUFFICIENT_BALANCE when available < amount

    const payment = new Payment({
      userId,
      direction: 'withdrawal',
      amount,
      referenceCode: 'WTH-' + Id.create().replace(/-/g, '').slice(0, 10).toUpperCase(),
    })

    await this.walletRepository.saveWithdrawalRequest(wallet, payment)
  }
}
