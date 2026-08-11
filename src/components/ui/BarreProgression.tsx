import { useEffect, useState } from 'react'

/** Barre qui se remplit en douceur vers son pourcentage cible, au lieu
 * d'apparaître déjà pleine — au montage comme à chaque changement de valeur. */
export function BarreProgression({
  pourcentage,
  couleur = 'var(--accent-4)',
  hauteur = 'h-1.5',
  className = '',
}: {
  pourcentage: number
  couleur?: string
  hauteur?: string
  className?: string
}) {
  const [largeur, setLargeur] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setLargeur(Math.min(Math.max(pourcentage, 0), 100)))
    return () => cancelAnimationFrame(id)
  }, [pourcentage])

  return (
    <div className={`overflow-hidden rounded-full bg-bg-elev-2 ${hauteur} ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${largeur}%`, background: couleur }}
      />
    </div>
  )
}
