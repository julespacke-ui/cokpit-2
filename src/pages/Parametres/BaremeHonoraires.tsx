import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { BaremeHonoraires as BaremeHonorairesRow, ModeTranche, TrancheHonoraires } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const TRANCHE_VIDE: TrancheHonoraires = { min: 0, max: 0, mode: 'fixe', valeur: 0 }

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
          <div key={i} className="flex flex-wrap items-center gap-2 border-b border-line pb-3 last:border-0">
            <Input
              type="number"
              value={tr.min}
              onChange={(e) => modifierTranche(i, { min: Number(e.target.value) })}
              placeholder="Min €"
              className="w-24"
            />
            <span className="text-text-faint">à</span>
            <Input
              type="number"
              value={tr.max}
              onChange={(e) => modifierTranche(i, { max: Number(e.target.value) })}
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

            <Input
              type="number"
              step={tr.mode === 'pourcentage' ? '0.1' : '1'}
              value={tr.valeur}
              onChange={(e) => modifierTranche(i, { valeur: Number(e.target.value) })}
              placeholder={tr.mode === 'pourcentage' ? 'Taux %' : 'Montant €'}
              className="w-28"
            />
            <span className="text-text-faint">{tr.mode === 'pourcentage' ? '%' : '€'}</span>

            {tr.mode === 'pourcentage' && (
              <>
                <span className="text-xs text-text-faint">plancher</span>
                <Input
                  type="number"
                  value={tr.plancher ?? ''}
                  onChange={(e) =>
                    modifierTranche(i, { plancher: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
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
