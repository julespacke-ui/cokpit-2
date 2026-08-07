interface PagePlaceholderProps {
  titre: string
  description: string
}

export function PagePlaceholder({ titre, description }: PagePlaceholderProps) {
  return (
    <div className="p-4 md:p-8">
      <h2 className="mb-4 font-heading text-2xl">{titre}</h2>
      <div className="rounded-[var(--radius-card)] border border-line bg-bg-elev p-6 text-text-dim">
        {description}
      </div>
    </div>
  )
}
