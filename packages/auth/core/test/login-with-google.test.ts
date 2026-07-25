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

  return { userRepository, oauthAccountRepository, googleVerifier, sessionRepository, loginWithGoogle }
}

test('first login creates a brand-new User (no password) and links the Google account', async () => {
  const { userRepository, oauthAccountRepository, googleVerifier, sessionRepository, loginWithGoogle } =
    setup()
  googleVerifier.register('token-1', {
    providerAccountId: 'google-sub-1',
    email: 'new@b.com',
    emailVerified: true,
    name: 'New User',
  })

  const tokens = await loginWithGoogle.execute({ idToken: 'token-1' })
  expect(tokens.accessToken.length).toBeGreaterThan(0)

  const user = await userRepository.findByEmail('new@b.com')
  expect(user).not.toBeNull()
  expect(user!.password).toBeUndefined()

  const account = await oauthAccountRepository.findByProvider('google', 'google-sub-1')
  expect(account!.userId).toBe(user!.id.value)

  const sessions = await sessionRepository.findActiveByUser(user!.id.value)
  expect(sessions).toHaveLength(1)
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
  const { userRepository, oauthAccountRepository, googleVerifier, loginWithGoogle } = setup()
  const hash = new HashProviderInMemory()
  await new RegisterUser(userRepository, hash).execute({ email: 'existing@b.com', password: 'Senha@123' })
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
  const { oauthAccountRepository, googleVerifier, loginWithGoogle } = setup()
  googleVerifier.register('token-1', {
    providerAccountId: 'google-sub-3',
    email: 'repeat@b.com',
    emailVerified: true,
    name: 'Repeat User',
  })
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
