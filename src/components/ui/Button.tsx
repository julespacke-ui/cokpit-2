import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent-4 text-bg hover:opacity-90',
  secondary: 'border border-line bg-bg-elev-2 text-text hover:bg-line',
  danger: 'bg-accent-3/15 text-accent-3 hover:bg-accent-3/25',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    />
  )
}
