/**
 * Formats a date (Date or ISO string from the API) as Brazilian date + time,
 * e.g. "25/07/2026 18:30".
 */
export function formatDateTime(value: Date | string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
