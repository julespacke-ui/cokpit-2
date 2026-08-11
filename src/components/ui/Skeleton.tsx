/** Placeholder de chargement générique — quelques barres qui pulsent doucement,
 * plutôt qu'un simple texte "Chargement…" ou un écran vide. */
export function Skeleton({ lignes = 3, className = '' }: { lignes?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lignes }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded-md bg-bg-elev-2"
          style={{ width: `${88 - i * 14}%`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

/** Variante carte : pour les emplacements de stat/KPI en cours de chargement. */
export function SkeletonCarte({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-card)] border border-line bg-bg-elev p-6 ${className}`}
      aria-hidden="true"
    >
      <div className="h-3 w-2/3 rounded bg-bg-elev-2" />
      <div className="mt-3 h-7 w-1/2 rounded bg-bg-elev-2" />
    </div>
  )
}

/** Variante tableau : quelques lignes de largeur variable pour un contenu tabulaire. */
export function SkeletonTableau({ lignes = 4 }: { lignes?: number }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-bg-elev p-4"
      aria-hidden="true"
    >
      {Array.from({ length: lignes }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded-md bg-bg-elev-2"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}
