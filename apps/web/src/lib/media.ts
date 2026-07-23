import { API_URL } from '@/lib/api/config'

/**
 * Builds the absolute URL of an uploaded file. The backend stores a relative
 * path (e.g. "/uploads/matchs/x.png") and serves it statically; the SPA runs on
 * another origin, so the API base is prepended for <img src>.
 */
export function mediaUrl(path: string): string {
  return `${API_URL}${path}`
}
