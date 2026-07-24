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

/**
 * Converts a date (Date or ISO string) into the value a
 * <input type="datetime-local"> expects: local "YYYY-MM-DDTHH:mm".
 */
export function toDateTimeLocalValue(value: Date | string): string {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
