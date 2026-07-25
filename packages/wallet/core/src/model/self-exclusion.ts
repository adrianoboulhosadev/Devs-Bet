import { Entity, EntityProps } from 'shared'

export type SelfExclusionPeriod = '24h' | '7d' | '30d' | 'permanent'

const PERIOD_DURATION_MS: Record<Exclude<SelfExclusionPeriod, 'permanent'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export interface SelfExclusionProps extends EntityProps {
  userId: string
  period: SelfExclusionPeriod
  startedAt?: Date
  until: Date | null // null = permanent, never ends
}

/**
 * Self-imposed block on depositing/betting (responsible gambling). Deliberately
 * has NO cancel/undo method — once started it runs its course (or, for
 * `permanent`, never ends): the whole point is protecting the user from their
 * own impulse to back out. `until` resolves whether it is still in force.
 */
export class SelfExclusion extends Entity<SelfExclusion, SelfExclusionProps> {
  readonly userId: string
  readonly period: SelfExclusionPeriod
  readonly startedAt: Date
  readonly until: Date | null

  constructor(props: SelfExclusionProps) {
    super(props)
    this.userId = props.userId
    this.period = props.period
    this.startedAt = props.startedAt ?? new Date()
    this.until = props.until ?? null
  }

  static start(userId: string, period: SelfExclusionPeriod): SelfExclusion {
    const startedAt = new Date()
    const until = period === 'permanent' ? null : new Date(startedAt.getTime() + PERIOD_DURATION_MS[period])
    return new SelfExclusion({ userId, period, startedAt, until })
  }

  get isActive(): boolean {
    return this.until === null || this.until.getTime() > Date.now()
  }
}
