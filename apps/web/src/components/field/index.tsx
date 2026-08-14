import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { sanitizeMoneyInput } from '@/lib/money'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  // A reais amount field: renders as text (never a native `type="number"`, so
  // there is no scientific notation, no spinner arrows and no scroll-to-change
  // wheel hijack) and strips anything that isn't a digit or a single decimal
  // separator as the user types. Pair with lib/money's toCents on submit.
  money?: boolean
}

// Labeled input with an optional error message. forwardRef so react-hook-form's
// `register` (which passes a ref) works transparently.
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, money = false, className = '', type, inputMode, onChange, ...props },
  ref,
) {
  const handleChange = money
    ? (event: ChangeEvent<HTMLInputElement>) => {
        event.target.value = sanitizeMoneyInput(event.target.value)
        onChange?.(event)
      }
    : onChange

  return (
    <label className="block space-y-2">
      <span className="font-pixel text-[9px] leading-relaxed tracking-widest text-arcade-text-muted">{label}</span>
      <input
        ref={ref}
        type={money ? 'text' : type}
        inputMode={money ? 'decimal' : inputMode}
        onChange={handleChange}
        className={`w-full border-3 border-arcade-border bg-[#0b0714] px-3 py-2.5 font-arcade text-xl text-arcade-text outline-none focus:border-arcade-cyan ${className}`}
        {...props}
      />
      {error && <span className="block font-arcade text-base text-arcade-danger">{error}</span>}
    </label>
  )
})
