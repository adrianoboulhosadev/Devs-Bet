import { AxiosError } from 'axios'
import { ERROR_MESSAGES } from '@/data/error-messages'

interface ErrorEnvelope {
  statusCode?: number
  errors?: Array<{ code: string }>
}

/**
 * Extracts a displayable message from the error. The backend responds in two ways:
 * domain -> `{ errors: [{ code }] }`; Nest HttpException -> string.
 * The friendly text comes from the static map in `data/error-messages`.
 */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data
    if (typeof body === 'string' && body.trim()) return body
    const code = (body as ErrorEnvelope | undefined)?.errors?.[0]?.code
    if (code) return ERROR_MESSAGES[code] ?? fallback
  }
  return fallback
}
