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
