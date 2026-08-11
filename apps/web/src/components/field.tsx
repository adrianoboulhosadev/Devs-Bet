import { forwardRef, type InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

// Labeled input with an optional error message. forwardRef so react-hook-form's
// `register` (which passes a ref) works transparently.
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, className = '', ...props },
  ref,
) {
  return (
    <label className="block space-y-2">
      <span className="font-pixel text-[9px] leading-relaxed tracking-widest text-arcade-text-muted">{label}</span>
      <input
        ref={ref}
        className={`w-full border-3 border-arcade-border bg-[#0b0714] px-3 py-2.5 font-arcade text-xl text-arcade-text outline-none focus:border-arcade-cyan ${className}`}
        {...props}
      />
      {error && <span className="block font-arcade text-base text-arcade-danger">{error}</span>}
    </label>
  )
})
