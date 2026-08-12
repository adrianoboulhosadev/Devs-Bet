import { Injectable, Logger } from '@nestjs/common'
import { DomainEvent, EventPublisher } from 'shared'
import { NotificationInput } from '@notification/adapters'
import { UserRegistered, UserApproved } from '@auth/adapters'
import {
  DepositRequested,
  WithdrawalRequested,
  DepositConfirmed,
  WithdrawalPaid,
  PaymentRejected,
} from '@wallet/adapters'
import { NotificationDispatcher } from './notification.dispatcher'
import { NotificationAudience } from './notification-audience'

/**
 * The single place that turns a DOMAIN EVENT into the notification(s) it
 * deserves. This used to be spread across four controllers, each hand-building
 * a NotificationInput right after calling its facade; with the events in place
 * the controllers went back to just calling the facade, and every "what do we
 * tell whom" decision lives here.
 *
 * Implements the `EventPublisher` port from `shared`, so the use cases depend on
 * an interface, never on this class.
 *
 * Unknown events are ignored on purpose: a context is free to raise an event
 * nobody notifies about yet (that is the point of events being facts, not
 * commands), and adding one must never break an existing flow.
 */
@Injectable()
export class DomainEventListener implements EventPublisher {
  private readonly logger = new Logger(DomainEventListener.name)

  constructor(
    private readonly notifications: NotificationDispatcher,
    private readonly audience: NotificationAudience,
  ) {}

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.notifications.notify(await this.translate(event))
      } catch (error) {
        // Never let a notification failure surface as a failed money move: the
        // business operation already committed before we got here.
        this.logger.error(`failed to handle ${event.constructor.name}`, error as Error)
      }
    }
  }

  private async translate(event: DomainEvent): Promise<NotificationInput[]> {
    // --- events that reach the ADMINS (something is waiting in the control room)
    if (event instanceof UserRegistered) {
      // The e-mail is in the text on purpose and only reaches admins: without it
      // the owner cannot tell which friend is asking to get in — the same reason
      // the control room shows it.
      return this.forEachAdmin((adminId) => ({
        userId: adminId,
        type: 'admin_signup_pending',
        signupEmail: event.email,
      }))
    }

    if (event instanceof DepositRequested) {
      const label = await this.audience.labelFor(event.userId)
      return this.forEachAdmin((adminId) => ({
        userId: adminId,
        type: 'admin_deposit_pending',
        bettorLabel: label,
        amount: event.amount,
      }))
    }

    if (event instanceof WithdrawalRequested) {
      const label = await this.audience.labelFor(event.userId)
      return this.forEachAdmin((adminId) => ({
        userId: adminId,
        type: 'admin_withdrawal_pending',
        bettorLabel: label,
        amount: event.amount,
      }))
    }

    // --- events that reach the account holder
    if (event instanceof UserApproved) {
      // Waiting in the inbox: the person only reads it once they can finally log
      // in, which is exactly when it is useful. Rejection raises no event at all
      // (see User.reject) — being barred must look like a wrong password.
      return [{ userId: event.userId, type: 'account_approved', referenceId: event.userId }]
    }

    if (event instanceof DepositConfirmed) {
      return [
        {
          userId: event.userId,
          type: 'deposit_confirmed',
          amount: event.amount,
          referenceId: event.paymentId,
        },
      ]
    }

    if (event instanceof WithdrawalPaid) {
      return [
        {
          userId: event.userId,
          type: 'withdrawal_paid',
          amount: event.amount,
          referenceId: event.paymentId,
        },
      ]
    }

    if (event instanceof PaymentRejected) {
      // One route rejects both directions; the event carries which one, so there
      // is no need to re-read the payment just to pick the wording.
      return [
        {
          userId: event.userId,
          type: event.direction === 'deposit' ? 'deposit_rejected' : 'withdrawal_rejected',
          amount: event.amount,
          referenceId: event.paymentId,
        },
      ]
    }

    return []
  }

  private async forEachAdmin(
    build: (adminId: string) => NotificationInput,
  ): Promise<NotificationInput[]> {
    const adminIds = await this.audience.adminIds()
    return adminIds.map(build)
  }
}
