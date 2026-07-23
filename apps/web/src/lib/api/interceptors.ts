import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { api, refreshClient } from './config'

// The access token lives IN MEMORY (not localStorage): it disappears on reload and
// is recovered by the silent refresh. The opaque refresh lives in the httpOnly
// cookie (out of JS reach).
let accessToken: string | null = null
export function setAccessToken(token: string | null): void {
  accessToken = token
}

// Dedup: concurrent 401s share a single in-flight /refresh.
let refreshInFlight: Promise<string> | null = null
export function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post<{ accessToken: string }>('/auth/refresh')
      .then((response) => {
        accessToken = response.data.accessToken
        return accessToken
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
        accessToken = null
        // let the 401 bubble up: the AuthProvider tears down the session and goes to login.
      }
    }
    return Promise.reject(error)
  },
)
