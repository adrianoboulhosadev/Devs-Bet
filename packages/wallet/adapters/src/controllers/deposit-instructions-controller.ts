import { PaymentGateway, DepositInstructions } from '@wallet/core'

/**
 * Thin presenter over the payment gateway: returns the (static) instructions the
 * user needs to Pix a top-up. No use case — it is a stateless infra read.
 */
export default class DepositInstructionsController {
  constructor(private readonly paymentGateway: PaymentGateway) {}

  execute(): DepositInstructions {
    return this.paymentGateway.depositInstructions()
  }
}
