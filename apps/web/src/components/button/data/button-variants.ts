export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning'

// `max-sm:whitespace-normal` é o que impede um rótulo comprido de virar um piso
// de largura (min-content) que empurra o container inteiro além da tela do
// celular: no desktop o botão continua numa linha só, abaixo de `sm` ele quebra.
// `text-center` mantém o rótulo alinhado quando ele quebra em duas linhas.
export const BUTTON_BASE_CLASS =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap max-sm:whitespace-normal px-4 py-3 text-center font-pixel text-[11px] tracking-wide uppercase transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-pixel-sm disabled:opacity-50 disabled:pointer-events-none'

// Chunky "8-bit" shadow in the fixed shadow ink (#08040f), colored border per
// variant — mirrors the mockup's block buttons exactly.
export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-arcade-magenta text-arcade-bg shadow-pixel hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-pixel-sm',
  secondary:
    'bg-transparent text-arcade-text border-3 border-arcade-border hover:border-arcade-cyan hover:text-arcade-cyan',
  danger:
    'bg-transparent text-arcade-danger border-3 border-arcade-danger hover:bg-arcade-danger hover:text-arcade-bg',
  success:
    'bg-arcade-lime text-arcade-bg shadow-pixel hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-pixel-sm',
  warning:
    'bg-arcade-amber text-arcade-bg shadow-pixel hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-pixel-sm',
}
