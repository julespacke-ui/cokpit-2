import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={`rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-base text-text outline-none transition-colors duration-150 focus:border-accent-1 ${className}`}
      />
    )
  },
)
