import { Errors, UnauthorizedError } from 'shared'
import { RegisterUser, LoginWithGoogle } from '../src'
import {
  UserRepositoryInMemory,
  HashProviderInMemory,
  JwtProviderInMemory,
  AuthSessionRepositoryInMemory,
  OAuthAccountRepositoryInMemory,
  GoogleTokenVerifierInMemory,
} from './in-memory'

function setup() {
  const userRepository = new UserRepositoryInMemory()
  const oauthAccountRepository = new OAuthAccountRepositoryInMemory()
  const googleVerifier = new GoogleTokenVerifierInMemory()
  const hash = new HashProviderInMemory()
  const jwt = new JwtProviderInMemory('secret')
  const sessionRepository = new AuthSessionRepositoryInMemory()

  const loginWithGoogle = new LoginWithGoogle(
    userRepository,
    oauthAccountRepository,
    googleVerifier,
    hash,
    jwt,
    sessionRepository,
  )

  // The platform is closed: a Google sign-in creates the account, but an admin
  // still has to release it before anyone gets in.
  const approve = async (email: string) => {
    const user = await userRepository.findByEmail(email)
    await userRepository.updateApprovalStatus(user!.id.value, 'approved')
  }

  return {
    userRepository,
    oauthAccountRepository,
    googleVerifier,
    sessionRepository,
    loginWithGoogle,
    approve,
  }
}

test('first login creates the User and links Google, but is held for approval', async () => {
  const { userRepository, oauthAccountRepository, googleVerifier, sessionRepository, loginWithGoogle } =
    setup()
  googleVerifier.register('token-1', {
    providerAccountId: 'google-sub-1',
    email: 'new@b.com',
    emailVerified: true,
    name: 'New User',
  })

  await expect(loginWithGoogle.execute({ idToken: 'token-1' })).rejects.toMatchObject({
    code: Errors.ACCOUNT_PENDING_APPROVAL,
  })

  // The account and the link exist — they are just waiting on an admin.
  const user = await userRepository.findByEmail('new@b.com')
  expect(user).not.toBeNull()
  expect(user!.password).toBeUndefined()
  expect(user!.approvalStatus).toBe('pending')

  const account = await oauthAccountRepository.findByProvider('google', 'google-sub-1')
  expect(account!.userId).toBe(user!.id.value)

  // Barred means barred: no session was opened.
  expect(await sessionRepository.findActiveByUser(user!.id.value)).toHaveLength(0)
})

test('once approved, the same Google account logs in and opens a session', async () => {
  const { userRepository, googleVerifier, sessionRepository, loginWithGoogle, approve } = setup()
  googleVerifier.register('token-1', {
    providerAccountId: 'google-sub-1',
    email: 'new@b.com',
    emailVerified: true,
    name: 'New User',
  })
  await expect(loginWithGoogle.execute({ idToken: 'token-1' })).rejects.toBeDefined()
  await approve('new@b.com')

  const tokens = await loginWithGoogle.execute({ idToken: 'token-1' })
  expect(tokens.accessToken.length).toBeGreaterThan(0)

  const user = await userRepository.findByEmail('new@b.com')
  expect(await sessionRepository.findActiveByUser(user!.id.value)).toHaveLength(1)
})

test('a revoked account is barred from Google login as invalid credentials', async () => {
  const { userRepository, googleVerifier, loginWithGoogle, approve } = setup()
  googleVerifier.register('token-1', {
    providerAccountId: 'google-sub-1',
    email: 'new@b.com',
    emailVerified: true,
    name: 'New User',
  })
  await expect(loginWithGoogle.execute({ idToken: 'token-1' })).rejects.toBeDefined()
  await approve('new@b.com')
  const user = await userRepository.findByEmail('new@b.com')
  await userRepository.updateApprovalStatus(user!.id.value, 'rejected')

  await expect(loginWithGoogle.execute({ idToken: 'token-1' })).rejects.toMatchObject({
    code: Errors.INVALID_EMAIL_OR_PASSWORD,
  })
})

test('an unverified Google email is rejected (OAUTH_EMAIL_NOT_VERIFIED)', async () => {
  const { googleVerifier, loginWithGoogle } = setup()
  googleVerifier.register('token-1', {
    providerAccountId: 'google-sub-1',
    email: 'unverified@b.com',
    emailVerified: false,
    name: null,
  })

  const login = loginWithGoogle.execute({ idToken: 'token-1' })
  await expect(login).rejects.toBeInstanceOf(UnauthorizedError)
  await expect(login).rejects.toMatchObject({ code: Errors.OAUTH_EMAIL_NOT_VERIFIED })
})

test('auto-links an existing (password) account by verified email', async () => {
  const { userRepository, oauthAccountRepository, googleVerifier, loginWithGoogle, approve } = setup()
  const hash = new HashProviderInMemory()
  await new RegisterUser(userRepository, hash).execute({ email: 'existing@b.com', password: 'Senha@123' })
  await approve('existing@b.com')
  const existingUser = await userRepository.findByEmail('existing@b.com')

  googleVerifier.register('token-1', {
    providerAccountId: 'google-sub-2',
    email: 'existing@b.com',
    emailVerified: true,
    name: 'Existing User',
  })

  await loginWithGoogle.execute({ idToken: 'token-1' })

  const account = await oauthAccountRepository.findByProvider('google', 'google-sub-2')
  expect(account!.userId).toBe(existingUser!.id.value)
  // Still the SAME user row — password-based login keeps working.
  const stillHasPassword = await userRepository.findByEmail('existing@b.com')
  expect(stillHasPassword!.password).toBeDefined()
})

test('a repeat login finds the linked account directly, without touching the email', async () => {
  const { oauthAccountRepository, googleVerifier, loginWithGoogle, approve } = setup()
  googleVerifier.register('token-1', {
    providerAccountId: 'google-sub-3',
    email: 'repeat@b.com',
    emailVerified: true,
    name: 'Repeat User',
  })
  await expect(loginWithGoogle.execute({ idToken: 'token-1' })).rejects.toBeDefined()
  await approve('repeat@b.com')
  await loginWithGoogle.execute({ idToken: 'token-1' })

  googleVerifier.register('token-2', {
    providerAccountId: 'google-sub-3',
    email: 'repeat@b.com',
    emailVerified: true,
    name: 'Repeat User',
  })
  await loginWithGoogle.execute({ idToken: 'token-2' })

  const accounts = (await oauthAccountRepository.findByProvider('google', 'google-sub-3'))!
  expect(accounts).not.toBeNull()
  // Still a single OAuthAccount row for this provider account (no duplicate link).
  expect((oauthAccountRepository as unknown as { rows: unknown[] }).rows).toHaveLength(1)
})

test('an invalid Google ID token is rejected (OAUTH_TOKEN_INVALID)', async () => {
  const { loginWithGoogle } = setup()
  const login = loginWithGoogle.execute({ idToken: 'not-registered' })
  await expect(login).rejects.toMatchObject({ code: Errors.OAUTH_TOKEN_INVALID })
})
