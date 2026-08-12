import type { Agence } from '../../types/database'

const CLASSE_PAR_DEFAUT = 'rounded-lg border border-line bg-bg-elev-2 px-3 py-2 text-sm text-text'

/** Sélecteur d'agence admin, utilisé partout où on choisit l'agence à
 * consulter — les comptes démo/test sont regroupés à part plutôt que
 * mélangés aux vraies agences dans la liste. */
export function SelecteurAgence({
  agences,
  value,
  onChange,
  /** Libellé d'une option vide en tête de liste (ex. "Aucune — prospect"). Omise si absente. */
  optionVide,
  /** Remplace entièrement les classes par défaut (compact) plutôt que de les compléter. */
  className,
}: {
  agences: Agence[]
  value: string
  onChange: (id: string) => void
  optionVide?: string
  className?: string
}) {
  const reelles = agences.filter((a) => !a.est_demo)
  const demo = agences.filter((a) => a.est_demo)

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className ?? CLASSE_PAR_DEFAUT}>
      {optionVide !== undefined && <option value="">{optionVide}</option>}
      {reelles.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nom}
        </option>
      ))}
      {demo.length > 0 && (
        <optgroup label="Démo / test">
          {demo.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nom}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}
