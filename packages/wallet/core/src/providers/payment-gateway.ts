/** Where the user sends the Pix to top up (the owner's account, static for now). */
export interface DepositInstructions {
  pixKey: string
  pixKeyType: string
  beneficiaryName: string
}

/**
 * Payment gateway port. Today the adapter is MANUAL/admin-confirmed: it only
 * yields the owner's static deposit instructions (the account to Pix into). Each
 * pending deposit already carries its own `referenceCode` and amount (read via
 * the payment history), so the instructions themselves are static. This is the
 * seam that lets a real PSP (Mercado Pago, Efí, Asaas…) replace the manual flow
 * later without touching the domain.
 */
export interface PaymentGateway {
  depositInstructions(): DepositInstructions
}
