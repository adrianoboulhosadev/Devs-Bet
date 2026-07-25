export interface RegisterUserInput {
  email: string
  password: string
}

export interface LoginUserInput {
  email: string
  password: string
}

/** The userId does NOT come in the body: it is resolved from the JWT at the HTTP boundary and passed separately. */
export interface ChangePasswordInput {
  oldPassword: string
  newPassword: string
}

/** The idToken is the Google-issued ID token the front got back after the
 * NextAuth handshake completed — see LoginWithGoogle (the backend verifies it
 * against Google's JWKS, never trusting the client's claim). */
export interface LoginWithGoogleInput {
  idToken: string
}
