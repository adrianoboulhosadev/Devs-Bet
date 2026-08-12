/**
 * Base of every DOMAIN EVENT — a plain, past-tense fact ("a payment was
 * confirmed", "a bet was won"), recorded by an AggregateRoot at the exact
 * moment its state changed. Carries only what the aggregate itself knows;
 * enrichment (a match's title, who the admins are) stays the job of whoever
 * consumes the event later — same split already used for notifications.
 */
export abstract class DomainEvent {
  readonly occurredAt: Date

  protected constructor() {
    this.occurredAt = new Date()
  }
}
