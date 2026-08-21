/**
 * Shortcuts that pre-fill the option list when opening a poll. A yes/no poll is
 * NOT a separate kind — it is just the two-option case, so this is purely a
 * typing shortcut for the admin and the domain never learns about it.
 */
export interface OptionPreset {
  id: string
  label: string
  options: string[]
}

export const OPTION_PRESETS: OptionPreset[] = [
  { id: 'yes-no', label: 'Sim / Não', options: ['Sim', 'Não'] },
  { id: 'blank', label: 'Em branco', options: ['', ''] },
]

/** Mirrors MIN_OPTIONS / MAX_OPTIONS in packages/poll/core's Poll aggregate. */
export const MIN_POLL_OPTIONS = 2
export const MAX_POLL_OPTIONS = 10
