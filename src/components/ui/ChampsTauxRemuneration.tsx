import { useState } from 'react'
import type { ConfigRemuneration, ModeTaux, TauxRemuneration, TypeRemuneration } from '../../types/database'
import { LABELS_TYPE_REMUNERATION } from '../../types/database'
import { Input } from './Input'
import { Toggle } from './Toggle'

const ORDRE_TYPES: TypeRemuneration[] = ['rdv', 'mandat', 'reservation', 'livraison']

const TAUX_VIDE: TauxRemuneration = { mode: 'pourcentage', valeur: 0 }

/** Accepte les nombres tapés avec virgule ou espaces, comme ChampMontant (BaremeHonoraires.tsx). */
function ChampValeur({ valeur, onChange }: { valeur: number; onChange: (n: number) => void }) {
  const [texte, setTexte] = useState(String(valeur))
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={texte}
      onChange={(e) => {
        const brut = e.target.value
        setTexte(brut)
        const nombre = Number(brut.replace(/\s/g, '').replace(',', '.'))
        if (!Number.isNaN(nombre)) onChange(nombre)
      }}
      className="w-28"
    />
  )
}

/**
 * Édite les 4 taux paramétrables (RDV/mandat/réservation/livraison).
 * Sans `tauxAgence` : formulaire des taux par défaut de l'agence, tous
 * toujours renseignés. Avec `tauxAgence` : formulaire de surcharge par
 * commercial — chaque type a son interrupteur, désactivé = retombe sur le
 * taux agence (affiché en repère) et n'est pas inclus dans `config`.
 */
export function ChampsTauxRemuneration({
  config,
  onChange,
  tauxAgence,
}: {
  config: ConfigRemuneration
  onChange: (config: ConfigRemuneration) => void
  tauxAgence?: ConfigRemuneration
}) {
  function modifierType(type: TypeRemuneration, changements: Partial<TauxRemuneration>) {
    const actuel = config[type] ?? tauxAgence?.[type] ?? TAUX_VIDE
    onChange({ ...config, [type]: { ...actuel, ...changements } })
  }

  function basculerSurcharge(type: TypeRemuneration, active: boolean) {
    if (!active) {
      const { [type]: _retire, ...reste } = config
      onChange(reste)
      return
    }
    onChange({ ...config, [type]: tauxAgence?.[type] ?? TAUX_VIDE })
  }

  return (
    <div className="flex flex-col gap-3">
      {ORDRE_TYPES.map((type) => {
        const surcharge = tauxAgence ? config[type] !== undefined : true
        const taux = config[type] ?? tauxAgence?.[type] ?? TAUX_VIDE

        return (
          <div key={type} className="flex flex-wrap items-center gap-3 border-b border-line pb-3 last:border-0">
            {tauxAgence && (
              <Toggle checked={surcharge} onChange={(v) => basculerSurcharge(type, v)} label={`Taux personnalisé ${LABELS_TYPE_REMUNERATION[type]}`} />
            )}
            <label className="w-40 shrink-0 text-sm text-text-dim">{LABELS_TYPE_REMUNERATION[type]}</label>

            {surcharge ? (
              <>
                <select
                  value={taux.mode}
                  onChange={(e) => modifierType(type, { mode: e.target.value as ModeTaux })}
                  className="rounded-lg border border-line bg-bg-elev-2 px-3 py-3 text-sm text-text"
                >
                  <option value="pourcentage">Pourcentage</option>
                  <option value="prime_fixe">Prime fixe</option>
                </select>
                <ChampValeur valeur={taux.valeur} onChange={(valeur) => modifierType(type, { valeur })} />
                <span className="text-text-faint">{taux.mode === 'pourcentage' ? '%' : '€'}</span>
              </>
            ) : (
              <span className="text-sm text-text-faint">
                Taux agence : {taux.valeur} {taux.mode === 'pourcentage' ? '%' : '€'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
