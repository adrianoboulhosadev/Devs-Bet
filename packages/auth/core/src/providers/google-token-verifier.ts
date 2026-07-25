/** Verified identity extracted from a Google ID token. */
export interface GoogleProfile {
  providerAccountId: string
  email: string
  emailVerified: boolean
  name: string | null
}

/**
 * Google ID token verification port (implemented with google-auth-library in
 * apps/backend). Verifies the token's signature/issuer/audience against
 * Google's JWKS — the use case never trusts a client-supplied identity
 * without this.
 */
export interface GoogleTokenVerifier {
  verify(idToken: string): Promise<GoogleProfile>
}
