import { CanActivate, Injectable, NotFoundException } from '@nestjs/common'

/** Whether "sign in with Google" is configured at all. The OAuth client id IS
 * the switch: no key, no feature — there is nothing to turn on separately and
 * nothing to forget to turn off. */
export function isGoogleLoginEnabled(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID?.trim()
}

/**
 * Closes POST /auth/oauth/google while the OAuth client does not exist yet.
 *
 * Hiding the button on the front is NOT enough — anyone can post to the route
 * directly, so this is the actual gate. And it must be a REFUSAL, not merely a
 * broken route: with GOOGLE_CLIENT_ID unset, google-auth-library skips the
 * audience check entirely (see verifySignedJwtWithCertsAsync: it only compares
 * when a required audience was given), so an ID token issued to ANY other
 * Google app would verify fine and open an account here.
 *
 * Answers a plain 404, exactly like a route that was never mapped: a disabled
 * feature should not announce that it exists.
 */
@Injectable()
export class GoogleLoginGuard implements CanActivate {
  canActivate(): boolean {
    if (!isGoogleLoginEnabled()) throw new NotFoundException()
    return true
  }
}
