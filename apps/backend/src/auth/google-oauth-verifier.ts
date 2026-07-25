import { Injectable } from '@nestjs/common'
import { OAuth2Client, type TokenPayload } from 'google-auth-library'
import { GoogleTokenVerifier, GoogleProfile } from '@auth/adapters'
import { UnauthorizedError, Errors } from 'shared'

// Verifies a Google-issued ID token against Google's own JWKS (signature +
// issuer + audience) — the client's claim of "who I am" is never trusted
// without this. `audience` must match the OAuth client id configured on the
// front (NextAuth's GoogleProvider), or a token meant for a different app
// would be accepted.
@Injectable()
export class GoogleOAuthVerifier implements GoogleTokenVerifier {
  private readonly client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

  async verify(idToken: string): Promise<GoogleProfile> {
    let payload: TokenPayload | undefined

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    } catch {
      UnauthorizedError.throwError(Errors.OAUTH_TOKEN_INVALID)
    }

    const providerAccountId = payload?.sub ?? ''
    const email = payload?.email ?? ''
    if (!providerAccountId || !email) UnauthorizedError.throwError(Errors.OAUTH_TOKEN_INVALID)

    return {
      providerAccountId,
      email,
      emailVerified: payload?.email_verified ?? false,
      name: payload?.name ?? null,
    }
  }
}
