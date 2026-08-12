import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { api, refreshClient } from './config'

// The access token lives IN MEMORY (not localStorage): it disappears on reload and
// is recovered by the silent refresh. The opaque refresh lives in the httpOnly
// cookie (out of JS reach).
let accessToken: string | null = null

// Whoever needs to REACT to the token changing — today the notification stream,
// whose EventSource carries the token in its URL and therefore has to be
// reopened when it rotates. A module-level variable cannot be watched by a hook,
// so `setAccessToken` (the single door login/refresh/logout all go through)
// announces it instead of anyone polling for it.
type TokenListener = (token: string | null) => void
const tokenListeners = new Set<TokenListener>()

export function getAccessToken(): string | null {
  return accessToken
}

/** Returns the unsubscribe function, so a React effect can clean up. */
export function onAccessTokenChange(listener: TokenListener): () => void {
  tokenListeners.add(listener)
  return () => tokenListeners.delete(listener)
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  tokenListeners.forEach((listener) => listener(token))
}

// Dedup: concurrent 401s share a single in-flight /refresh.
let refreshInFlight: Promise<string> | null = null
export function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post<{ accessToken: string }>('/auth/refresh')
      .then((response) => {
        // Through setAccessToken, not a bare assignment: a rotated token has to
        // reach the listeners (the notification stream reopens with it).
        setAccessToken(response.data.accessToken)
        return response.data.accessToken
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true
      try {
        const newToken = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        setAccessToken(null)
        // let the 401 bubble up: the AuthProvider tears down the session and goes to login.
      }
    }
    return Promise.reject(error)
  },
)
