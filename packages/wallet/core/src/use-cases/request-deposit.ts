import { UseCase, Money, ValidationError, Errors, Id } from 'shared'
import { Payment } from '../model'
import { WalletRepository } from '../providers'

interface Input {
  userId: string
  amount: number // cents
}

/**
 * Opens a pending deposit: the user declares how much they will send by Pix. We
 * only record the intent (with a reference code to match the incoming Pix); the
 * balance is credited later, when the admin confirms receipt.
 */
export default class RequestDeposit implements UseCase<Input, void> {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute({ userId, amount }: Input): Promise<void> {
    const value = new Money(amount)
    if (value.isZero()) ValidationError.throwError(Errors.INVALID_AMOUNT, amount)

    const payment = new Payment({
      userId,
      direction: 'deposit',
      amount,
      referenceCode: 'DEP-' + Id.create().replace(/-/g, '').slice(0, 10).toUpperCase(),
    })

    await this.walletRepository.saveDepositRequest(payment)
  }
}
