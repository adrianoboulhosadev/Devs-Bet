import IORedis from 'ioredis'

/** MUST match the backend's channelFor (apps/backend/src/notification/live-updates.ts)
 * — the backend is what subscribes, this only publishes. Same spirit as the
 * queue-name literals shared between producer and consumer. */
function channelFor(userId: string): string {
  return `notifications-${userId}`
}

const publisher = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

/**
 * Pushes "your inbox changed" to whichever backend instance is holding those
 * bettors' SSE connections, so a settled bet lights up the bell without a
 * reload.
 *
 * Called AFTER the settlement transaction commits — the notification rows are
 * already safe at that point, so a failed ping only costs the live refresh (the
 * client still sees the notification on its next read), never the notification
 * itself. Hence the swallowed error.
 */
export async function pushLiveUpdates(userIds: string[]): Promise<void> {
  await Promise.all(
    [...new Set(userIds)].map(async (userId) => {
      try {
        await publisher.publish(channelFor(userId), '1')
      } catch (error) {
        console.warn(`[worker] failed to push a live update to ${userId}:`, error)
      }
    }),
  )
}

export async function closeLiveUpdates(): Promise<void> {
  await publisher.quit()
}
