import { Poll } from '../model'

/**
 * Poll WRITE port (command side). Options are created together with the poll
 * (aggregate) and never change afterwards; `update` persists the lifecycle
 * fields (status, winning option, deadline, timestamps).
 */
export interface PollRepository {
  findById(id: string): Promise<Poll | null>
  create(poll: Poll): Promise<void>
  update(poll: Poll): Promise<void>
}
