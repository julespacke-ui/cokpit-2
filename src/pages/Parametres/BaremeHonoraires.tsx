import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { BaremeHonoraires as BaremeHonorairesRow, ModeTranche, TrancheHonoraires } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const TRANCHE_VIDE: TrancheHonoraires = { min: 0, max: 0, mode: 'fixe', valeur: 0 }

/** Accepte les nombres tapés avec virgule ou espaces (ex. "15 000", "8,5") tout
 * en gardant une valeur numérique fiable pour les calculs d'honoraires. */
function ChampMontant({
  valeur,
  onChange,
  placeholder,
  className,
}: {
  valeur: number
  onChange: (n: number) => void
  placeholder?: string
  className?: string
}) {
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
      placeholder={placeholder}
      className={className}
    />
  )
}

export function BaremeHonoraires({ agenceId }: { agenceId: string }) {
  const [chargement, setChargement] = useState(true)
  const [tranches, setTranches] = useState<TrancheHonoraires[]>([TRANCHE_VIDE])
  const [message, setMessage] = useState<string | null>(null)
  const [enregistrement, setEnregistrement] = useState(false)

  useEffect(() => {
    setChargement(true)
    setMessage(null)
    supabase
      .from('baremes_honoraires')
      .select('*')
      .eq('agence_id', agenceId)
      .maybeSingle()
      .then(({ data }) => {
        const bareme = data as BaremeHonorairesRow | null
        setTranches(bareme?.config.tranches?.length ? bareme.config.tranches : [TRANCHE_VIDE])
        setChargement(false)
      })
  }, [agenceId])

  function ajouterTranche() {
    setTranches((t) => [...t, { ...TRANCHE_VIDE }])
  }

  function supprimerTranche(index: number) {
    setTranches((t) => t.filter((_, i) => i !== index))
  }

  function modifierTranche(index: number, changements: Partial<TrancheHonoraires>) {
    setTranches((t) => t.map((tr, i) => (i === index ? { ...tr, ...changements } : tr)))
  }

  async function enregistrer() {
    setEnregistrement(true)
    setMessage(null)
    const { error } = await supabase
      .from('baremes_honoraires')
      .upsert({ agence_id: agenceId, type: 'tranches', config: { tranches } }, { onConflict: 'agence_id' })
    setEnregistrement(false)
    setMessage(error ? `Erreur : ${error.message}` : 'Barème enregistré.')
  }

  if (chargement) return <p className="text-text-dim">Chargement…</p>

  return (
    <Card className="max-w-3xl">
      <p className="mb-4 text-sm text-text-dim">
        Chaque tranche peut préconiser un montant fixe ou un pourcentage du prix de vente. Ex. : jusqu'à
        15 000 € → 1 275 € fixe, de 15 000 à 35 000 € → 8,5 %.
      </p>

      <div className="flex flex-col gap-3">
        {tranches.map((tr, i) => (
          <div
            key={`${agenceId}-${i}`}
            className="flex flex-wrap items-center gap-2 border-b border-line pb-3 last:border-0"
          >
            <ChampMontant
              valeur={tr.min}
              onChange={(min) => modifierTranche(i, { min })}
              placeholder="Min €"
              className="w-24"
            />
            <span className="text-text-faint">à</span>
            <ChampMontant
              valeur={tr.max}
              onChange={(max) => modifierTranche(i, { max })}
              placeholder="Max €"
              className="w-24"
            />
            <span className="text-text-faint">→</span>

            <select
              value={tr.mode}
              onChange={(e) => modifierTranche(i, { mode: e.target.value as ModeTranche })}
              className="rounded-lg border border-line bg-bg-elev-2 px-3 py-3 text-sm text-text"
            >
              <option value="fixe">Montant fixe</option>
              <option value="pourcentage">Pourcentage</option>
            </select>

            <ChampMontant
              valeur={tr.valeur}
              onChange={(valeur) => modifierTranche(i, { valeur })}
              placeholder={tr.mode === 'pourcentage' ? 'Taux %' : 'Montant €'}
              className="w-28"
            />
            <span className="text-text-faint">{tr.mode === 'pourcentage' ? '%' : '€'}</span>

            {tr.mode === 'pourcentage' && (
              <>
                <span className="text-xs text-text-faint">plancher</span>
                <ChampMontant
                  valeur={tr.plancher ?? 0}
                  onChange={(plancher) => modifierTranche(i, { plancher })}
                  placeholder="optionnel €"
                  className="w-28"
                />
              </>
            )}

            <Button variant="danger" type="button" onClick={() => supprimerTranche(i)}>
              Retirer
            </Button>
          </div>
        ))}
        <Button variant="secondary" type="button" onClick={ajouterTranche} className="self-start">
          + Ajouter une tranche
        </Button>
      </div>

      {message && <p className="mt-4 text-sm text-text-dim">{message}</p>}

      <Button onClick={enregistrer} disabled={enregistrement} className="mt-6">
        {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </Card>
  )
}
