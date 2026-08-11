import { useEffect, useRef, useState } from 'react'

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function reduireMouvement(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Chiffre qui s'anime de sa valeur précédente vers la nouvelle au lieu
 * d'apparaître d'un coup — utilisé sur les KPI mis en avant (Accueil,
 * objectifs). Respecte prefers-reduced-motion. */
export function CompteurAnime({
  valeur,
  decimales = 0,
  suffixe = '',
  duree = 650,
}: {
  valeur: number
  decimales?: number
  suffixe?: string
  duree?: number
}) {
  const [affiche, setAffiche] = useState(valeur)
  const actuel = useRef(valeur)
  const frame = useRef<number>(0)

  useEffect(() => {
    if (reduireMouvement()) {
      actuel.current = valeur
      setAffiche(valeur)
      return
    }

    const depart = actuel.current
    const debut = performance.now()

    function tick(maintenant: number) {
      const t = Math.min((maintenant - debut) / duree, 1)
      const v = depart + (valeur - depart) * easeOutCubic(t)
      actuel.current = v
      setAffiche(v)
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [valeur, duree])

  return (
    <>
      {affiche.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
      {suffixe}
    </>
  )
}
