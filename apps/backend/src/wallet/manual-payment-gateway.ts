import { Injectable } from '@nestjs/common'
import { PaymentGateway, DepositInstructions } from '@wallet/adapters'

/**
 * Manual payment gateway: the deposit destination is the owner's own Pix account,
 * read from the environment. Deposits are confirmed by the admin after the Pix
 * lands. Swap this adapter for a real PSP later without touching the domain.
 */
@Injectable()
export class ManualPaymentGateway implements PaymentGateway {
  depositInstructions(): DepositInstructions {
    return {
      pixKey: process.env.WALLET_PIX_KEY ?? '',
      pixKeyType: process.env.WALLET_PIX_KEY_TYPE ?? 'email',
      beneficiaryName: process.env.WALLET_BENEFICIARY_NAME ?? '',
    }
  }
}
