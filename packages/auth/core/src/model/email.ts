import { ValidationError, Errors } from 'shared'

/**
 * Email value object. Normalizes (trim + lowercase) and validates the format in
 * the constructor — an invalid email can never exist as an Email. Immutable;
 * exposes derived parts (`user`, `domain`).
 */
export class Email {
  static readonly REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim().toLowerCase() ?? ''
    if (!Email.isValid(this.value)) ValidationError.throwError(Errors.INVALID_EMAIL, this.value)
  }

  static isValid(email: string): boolean {
    return Email.REGEX.test(email)
  }

  get user(): string {
    return this.value.split('@')[0]
  }

  get domain(): string {
    return this.value.split('@')[1]
  }
}
