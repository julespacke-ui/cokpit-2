import type { Agence } from '../../types/database'

/** Sélecteur d'agence admin, utilisé partout où on choisit l'agence à
 * consulter — les comptes démo/test sont regroupés à part plutôt que
 * mélangés aux vraies agences dans la liste. */
export function SelecteurAgence({
  agences,
  value,
  onChange,
  className = '',
}: {
  agences: Agence[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  const reelles = agences.filter((a) => !a.est_demo)
  const demo = agences.filter((a) => a.est_demo)

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-line bg-bg-elev-2 px-3 py-2 text-sm text-text ${className}`}
    >
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
