import { DomainEvent } from 'shared'

/**
 * Raised directly by `RegisterUser` (not via `AggregateRoot.record` — see
 * that use case for why creation events skip the entity). Reaches every
 * admin: the front door needs to know someone is waiting at the gate.
 */
export class UserRegistered extends DomainEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    super()
  }
}

/**
 * Raised by `User.approve()`. `reject()` deliberately raises NOTHING — being
 * barred has to look like a wrong password (see LoginUser), and an event
 * feeding a notification would give that away.
 */
export class UserApproved extends DomainEvent {
  constructor(readonly userId: string) {
    super()
  }
}
