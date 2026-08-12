import {
  WalletRepository,
  WalletQueryRepository,
  PaymentQueryRepository,
  PaymentGateway,
  DepositLimitQueryRepository,
  WalletDTO,
  PaymentDTO,
  DepositInstructions,
  DepositLimitDTO,
  SelfExclusionDTO,
} from '@wallet/core'
import { AuthenticatedActor, EventPublisher } from 'shared'
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
  SetDepositLimitController,
  ListMyDepositLimitsController,
  StartSelfExclusionController,
  GetMySelfExclusionController,
} from '../controllers'
import { DepositInput, WithdrawalInput, SetDepositLimitInput, StartSelfExclusionInput } from '../@types'

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
    private readonly depositLimitQueryRepository?: DepositLimitQueryRepository,
    // Domain events raised by the money moves below (see @wallet/core's events):
    // the app turns them into notifications + a live update.
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async requestDeposit(input: DepositInput, userId: string): Promise<void> {
    await new RequestDepositController(this.walletRepository!, this.eventPublisher).execute(
      input,
      userId,
    )
  }

  async requestWithdrawal(input: WithdrawalInput, userId: string): Promise<void> {
    await new RequestWithdrawalController(this.walletRepository!, this.eventPublisher).execute(
      input,
      userId,
    )
  }

  async confirmDeposit(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    await new ConfirmDepositController(this.walletRepository!, this.eventPublisher).execute(
      paymentId,
      actor,
    )
  }

  async confirmWithdrawal(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    await new ConfirmWithdrawalController(this.walletRepository!, this.eventPublisher).execute(
      paymentId,
      actor,
    )
  }

  async rejectPayment(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    await new RejectPaymentController(this.walletRepository!, this.eventPublisher).execute(
      paymentId,
      actor,
    )
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

  async setDepositLimit(input: SetDepositLimitInput, userId: string): Promise<void> {
    await new SetDepositLimitController(this.walletRepository!).execute(input, userId)
  }

  async listMyDepositLimits(userId: string): Promise<DepositLimitDTO[]> {
    return new ListMyDepositLimitsController(this.depositLimitQueryRepository!).execute(userId)
  }

  async startSelfExclusion(input: StartSelfExclusionInput, userId: string): Promise<void> {
    await new StartSelfExclusionController(this.walletRepository!).execute(input, userId)
  }

  async getMySelfExclusion(userId: string): Promise<SelfExclusionDTO | null> {
    return new GetMySelfExclusionController(this.walletQueryRepository!).execute(userId)
  }
}
