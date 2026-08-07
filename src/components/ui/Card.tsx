import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-bg-elev p-6 ${className}`}>
      {children}
    </div>
  )
}
