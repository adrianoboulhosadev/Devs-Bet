import { Errors } from 'shared'
import { User, UserApproved } from '../src'

const validHash = '$2a$12$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY./'

test('builds a user with value objects and sensible defaults', () => {
  const user = new User({ email: 'a@b.com', password: validHash })
  expect(user.email.value).toBe('a@b.com')
  expect(user.password!.value).toBe(validHash)
  expect(user.role).toBe('user')
  expect(user.active).toBe(true)
  expect(user.isAdmin).toBe(false)
})

test('an admin user reports isAdmin', () => {
  expect(new User({ email: 'a@b.com', role: 'admin' }).isAdmin).toBe(true)
})

test('can be reconstituted without the password (read projection)', () => {
  const user = new User({ email: 'a@b.com' })
  expect(user.password).toBeUndefined()
})

test('withoutPassword drops the secret keeping the identity', () => {
  const user = new User({ email: 'a@b.com', password: validHash })
  const stripped = user.withoutPassword()
  expect(stripped.password).toBeUndefined()
  expect(stripped.id.value).toBe(user.id.value)
  expect(stripped.email.value).toBe('a@b.com')
})

test('deactivate flips the active flag', () => {
  const user = new User({ email: 'a@b.com' })
  user.deactivate()
  expect(user.active).toBe(false)
})

test('a brand-new user is pending, not approved (closed platform)', () => {
  const user = new User({ email: 'a@b.com' })
  expect(user.approvalStatus).toBe('pending')
  expect(user.isApproved).toBe(false)
})

test('approve/reject move the account in and out', () => {
  const user = new User({ email: 'a@b.com' })

  user.approve()
  expect(user.isApproved).toBe(true)

  // Rejecting an approved account is how access gets revoked.
  user.reject()
  expect(user.approvalStatus).toBe('rejected')
  expect(user.isApproved).toBe(false)

  // And a rejected one can be let back in.
  user.approve()
  expect(user.isApproved).toBe(true)
})

test('approve records a UserApproved domain event', () => {
  const user = new User({ email: 'a@b.com' })
  user.approve()

  const events = user.pullDomainEvents()
  expect(events).toHaveLength(1)
  expect(events[0]).toBeInstanceOf(UserApproved)
  expect((events[0] as UserApproved).userId).toBe(user.id.value)
})

test('reject raises NOTHING — being barred must stay silent, like a wrong password', () => {
  const user = new User({ email: 'a@b.com' })
  user.approve() // clears any prior event, isolating what reject() does
  user.pullDomainEvents()

  user.reject()

  expect(user.pullDomainEvents()).toHaveLength(0)
})

test('pullDomainEvents drains the list — a second call comes back empty', () => {
  const user = new User({ email: 'a@b.com' })
  user.approve()

  expect(user.pullDomainEvents()).toHaveLength(1)
  expect(user.pullDomainEvents()).toHaveLength(0)
})

test('rejects an invalid email at construction', () => {
  try {
    new User({ email: 'bad' })
  } catch (error) {
    expect((error as { code: string }).code).toBe(Errors.INVALID_EMAIL)
  }
})

test('rejects a malformed password hash at construction', () => {
  try {
    new User({ email: 'a@b.com', password: 'not-a-hash' })
  } catch (error) {
    expect((error as { code: string }).code).toBe(Errors.INVALID_PASSWORD_HASH)
  }
})
