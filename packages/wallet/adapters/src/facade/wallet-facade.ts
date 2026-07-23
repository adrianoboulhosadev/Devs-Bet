import {
  WalletRepository,
  WalletQueryRepository,
  PaymentQueryRepository,
  PaymentGateway,
  WalletDTO,
  PaymentDTO,
  DepositInstructions,
} from '@wallet/core'
import { AuthenticatedActor } from 'shared'
import {
  RequestDepositController,
  RequestWithdrawalController,
  ConfirmDepositController,
  ConfirmWithdrawalController,
  RejectPaymentController,
  GetMyWalletController,
  ListMyPaymentsController,
  ListPendingPaymentsController,
  DepositInstructionsController,
} from '../controllers'
import { DepositInput, WithdrawalInput } from '../@types'

/**
 * Single entry point the backend (NestJS) calls. Optional ports in the
 * constructor; each method builds its controller. userId comes from the JWT; the
 * admin actor (id + role) too — the role is enforced again inside the use case.
 */
export default class WalletFacade {
  constructor(
    private readonly walletRepository?: WalletRepository,
    private readonly walletQueryRepository?: WalletQueryRepository,
    private readonly paymentQueryRepository?: PaymentQueryRepository,
    private readonly paymentGateway?: PaymentGateway,
  ) {}

  async requestDeposit(input: DepositInput, userId: string): Promise<void> {
    await new RequestDepositController(this.walletRepository!).execute(input, userId)
  }

  async requestWithdrawal(input: WithdrawalInput, userId: string): Promise<void> {
    await new RequestWithdrawalController(this.walletRepository!).execute(input, userId)
  }

  async confirmDeposit(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    await new ConfirmDepositController(this.walletRepository!).execute(paymentId, actor)
  }

  async confirmWithdrawal(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    await new ConfirmWithdrawalController(this.walletRepository!).execute(paymentId, actor)
  }

  async rejectPayment(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    await new RejectPaymentController(this.walletRepository!).execute(paymentId, actor)
  }

  async getMyWallet(userId: string): Promise<WalletDTO> {
    return new GetMyWalletController(this.walletQueryRepository!).execute(userId)
  }

  async listMyPayments(userId: string): Promise<PaymentDTO[]> {
    return new ListMyPaymentsController(this.paymentQueryRepository!).execute(userId)
  }

  async listPendingPayments(actor: AuthenticatedActor): Promise<PaymentDTO[]> {
    return new ListPendingPaymentsController(this.paymentQueryRepository!).execute(actor)
  }

  depositInstructions(): DepositInstructions {
    return new DepositInstructionsController(this.paymentGateway!).execute()
  }
}
