interface JaugeObjectifProps {
  label: string
  valeur: number
  cible: number
  unite?: string
}

export function JaugeObjectif({ label, valeur, cible, unite = '' }: JaugeObjectifProps) {
  const pourcentage = cible > 0 ? Math.min((valeur / cible) * 100, 100) : 0
  const atteint = cible > 0 && valeur >= cible

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-bg-elev p-4">
      <p className="text-sm text-text-dim">{label}</p>
      <p className="mt-1 font-heading text-xl tabular-nums">
        {Math.round(valeur).toLocaleString('fr-FR')}
        {unite}{' '}
        <span className="text-sm font-normal text-text-faint">
          / {cible.toLocaleString('fr-FR')}
          {unite}
        </span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elev-2">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pourcentage}%`,
            background: atteint ? 'var(--accent-2)' : 'linear-gradient(90deg, var(--accent-4), var(--accent-1))',
          }}
        />
      </div>
    </div>
  )
}
