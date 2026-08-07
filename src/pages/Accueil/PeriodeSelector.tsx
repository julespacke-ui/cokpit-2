import { useEffect, useState } from 'react'
import type { Granularite } from '../../lib/periodes'
import { calculerPeriode, decalerReference, formatPeriode, toISODate } from '../../lib/periodes'

const GRANULARITES: { valeur: Granularite; label: string }[] = [
  { valeur: 'semaine', label: 'Semaine' },
  { valeur: 'mois', label: 'Mois' },
  { valeur: 'trimestre', label: 'Trimestre' },
]

export interface PlagePeriode {
  du: string
  au: string
  label: string
}

interface PeriodeSelectorProps {
  onChange: (plage: PlagePeriode) => void
}

export function PeriodeSelector({ onChange }: PeriodeSelectorProps) {
  const [granularite, setGranularite] = useState<Granularite | 'personnalise'>('mois')
  const [reference, setReference] = useState(new Date())
  const [du, setDu] = useState(toISODate(calculerPeriode('mois', new Date()).debut))
  const [au, setAu] = useState(toISODate(calculerPeriode('mois', new Date()).fin))

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onChange({ du, au, label: formatPeriode('mois', calculerPeriode('mois', new Date())) })
  }, [])

  function appliquer(g: Granularite, ref: Date) {
    const periode = calculerPeriode(g, ref)
    const plage = { du: toISODate(periode.debut), au: toISODate(periode.fin), label: formatPeriode(g, periode) }
    setDu(plage.du)
    setAu(plage.au)
    onChange(plage)
  }

  function choisirGranularite(g: Granularite) {
    setGranularite(g)
    setReference(new Date())
    appliquer(g, new Date())
  }

  function naviguer(direction: 1 | -1) {
    if (granularite === 'personnalise') return
    const nouvelleRef = decalerReference(granularite, reference, direction)
    setReference(nouvelleRef)
    appliquer(granularite, nouvelleRef)
  }

  function appliquerPersonnalise(nouveauDu: string, nouveauAu: string) {
    setDu(nouveauDu)
    setAu(nouveauAu)
    onChange({ du: nouveauDu, au: nouveauAu, label: 'Personnalisé' })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-lg border border-line bg-bg-elev-2 p-1">
        {GRANULARITES.map((g) => (
          <button
            key={g.valeur}
            type="button"
            onClick={() => choisirGranularite(g.valeur)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              granularite === g.valeur ? 'bg-accent-4 text-bg' : 'text-text-dim'
            }`}
          >
            {g.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setGranularite('personnalise')}
          className={`rounded-md px-3 py-1.5 text-sm ${
            granularite === 'personnalise' ? 'bg-accent-4 text-bg' : 'text-text-dim'
          }`}
        >
          Personnalisé
        </button>
      </div>

      {granularite === 'personnalise' ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={du}
            onChange={(e) => appliquerPersonnalise(e.target.value, au)}
            className="rounded-lg border border-line bg-bg-elev-2 px-3 py-1.5 text-sm text-text"
          />
          <span className="text-text-faint">→</span>
          <input
            type="date"
            value={au}
            onChange={(e) => appliquerPersonnalise(du, e.target.value)}
            className="rounded-lg border border-line bg-bg-elev-2 px-3 py-1.5 text-sm text-text"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-text-dim">
          <button
            type="button"
            onClick={() => naviguer(-1)}
            className="rounded-lg border border-line px-2.5 py-1.5 hover:text-text"
          >
            ←
          </button>
          <span>{formatPeriode(granularite, calculerPeriode(granularite, reference))}</span>
          <button
            type="button"
            onClick={() => naviguer(1)}
            className="rounded-lg border border-line px-2.5 py-1.5 hover:text-text"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
