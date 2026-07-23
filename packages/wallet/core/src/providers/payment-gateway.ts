import { Money } from 'shared'

/** Where the user sends the Pix to top up (the owner's account, static for now). */
export interface DepositInstructions {
  pixKey: string
  pixKeyType: string
  beneficiaryName: string
  referenceCode: string
  amount: number
}

/**
 * Payment gateway port. Today the adapter is MANUAL/admin-confirmed: it only
 * yields the owner's deposit instructions (static account). It is the seam that
 * lets a real PSP (Mercado Pago, Efí, Asaas…) replace the manual flow later
 * without touching the domain.
 */
export interface PaymentGateway {
  depositInstructions(referenceCode: string, amount: Money): DepositInstructions
}
