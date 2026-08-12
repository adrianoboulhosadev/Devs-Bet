import { Controller, Header, Req, Sse, UseGuards } from '@nestjs/common'
import { Observable } from 'rxjs'
import { LiveUpdates } from './live-updates'
import { StreamAuthGuard, RequestWithStreamUser } from './stream-auth.guard'

/**
 * The live channel that replaced the bell's polling: the browser holds one
 * EventSource open here and the backend pushes a ping whenever THIS user's
 * inbox changes (see LiveUpdates / DomainEventListener).
 *
 * A separate controller from NotificationController on purpose: the
 * AuthMiddleware is applied per CLASS (`forRoutes(NotificationController)`) and
 * reads the Authorization header, which EventSource cannot send — so this class
 * stays out of the middleware and authenticates with StreamAuthGuard instead.
 *
 * Server-Sent Events rather than WebSocket: the traffic only ever flows one way
 * (server → browser), and EventSource reconnects on its own after a drop, which
 * is exactly the behavior wanted here and would otherwise have to be written by
 * hand.
 */
@Controller('notification')
export class NotificationStreamController {
  constructor(private readonly liveUpdates: LiveUpdates) {}

  // Returns the Observable SYNCHRONOUSLY — Nest does not await an @Sse handler
  // (see router-execution-context), so the authentication has to happen in the
  // guard above, not here.
  //
  // X-Accel-Buffering tells Nginx to not buffer THIS response, which is what
  // SSE needs (a buffered stream reaches the browser only once the buffer
  // fills, so the bell looks frozen). deploy/nginx.conf already turns buffering
  // off for this route; the header is the belt-and-braces version that keeps
  // the stream working even behind a proxy nobody configured for it.
  @Sse('stream')
  @Header('X-Accel-Buffering', 'no')
  @UseGuards(StreamAuthGuard)
  stream(@Req() request: RequestWithStreamUser): Observable<{ data: string }> {
    return this.liveUpdates.streamFor(request.streamUserId)
  }
}
