import type { ButtonHTMLAttributes } from 'react'
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASSES, type ButtonVariant } from './data/button-variants'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
