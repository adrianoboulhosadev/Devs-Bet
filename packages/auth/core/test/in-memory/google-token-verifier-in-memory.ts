import { UnauthorizedError, Errors } from 'shared'
import { GoogleTokenVerifier, GoogleProfile } from '../../src'

/**
 * Fake Google verifier for testing the core: `idToken` is just an opaque key
 * into a preset table of profiles the test registers, so there is no real JWT/
 * JWKS involved. Throws on an unregistered token — mirrors an invalid/expired
 * ID token being rejected by the real adapter.
 */
export default class GoogleTokenVerifierInMemory implements GoogleTokenVerifier {
  private readonly profiles = new Map<string, GoogleProfile>()

  register(idToken: string, profile: GoogleProfile): void {
    this.profiles.set(idToken, profile)
  }

  async verify(idToken: string): Promise<GoogleProfile> {
    const profile = this.profiles.get(idToken)
    if (!profile) UnauthorizedError.throwError(Errors.OAUTH_TOKEN_INVALID, idToken)
    return profile
  }
}
