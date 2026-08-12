/**
 * Feature switches read by the browser. NEXT_PUBLIC_* values are INLINED by
 * `next build`, so this is a build-time decision, not a runtime one — flipping
 * it means rebuilding the web image (same as NEXT_PUBLIC_API_URL).
 *
 * Default is OFF: an unset variable must never leave a half-configured feature
 * exposed. This only hides the UI — the real gate is the backend refusing
 * POST /auth/oauth/google (see GoogleLoginGuard), because a hidden button
 * stops nobody from calling the route directly.
 */
export const GOOGLE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === 'true'
