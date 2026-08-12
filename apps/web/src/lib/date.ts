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
 * Short "how long ago" label for the notification inbox, where the exact
 * timestamp matters far less than the freshness. Falls back to the plain date
 * once a week has passed — "há 34d" stops telling anyone anything.
 */
export function formatRelativeTime(value: Date | string): string {
  const elapsedMs = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(elapsedMs / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days}d`

  return formatDateTime(value).split(' ')[0]
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
