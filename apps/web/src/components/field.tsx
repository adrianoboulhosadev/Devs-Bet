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
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        ref={ref}
        className={`w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-red-700">{error}</span>}
    </label>
  )
})
