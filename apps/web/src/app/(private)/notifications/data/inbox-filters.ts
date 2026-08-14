/** "Todas" ou só as não lidas — os dois estados da caixa de entrada. */
export type InboxFilter = 'all' | 'unread'

export const FILTERS: { value: InboxFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'Não lidas' },
]
