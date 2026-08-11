import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { PackMer } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'

export function PacksMer({ agenceId }: { agenceId: string }) {
  const [packs, setPacks] = useState<PackMer[]>([])
  const [chargement, setChargement] = useState(true)
  const [nouveauNom, setNouveauNom] = useState('')
  const [nouveauPrix, setNouveauPrix] = useState<number | ''>('')
  const [ajout, setAjout] = useState(false)

  function charger() {
    setChargement(true)
    supabase
      .from('packs_mer')
      .select('*')
      .eq('agence_id', agenceId)
      .order('nom')
      .then(({ data }) => {
        setPacks(data ?? [])
        setChargement(false)
      })
  }

  useEffect(charger, [agenceId])

  async function ajouterPack() {
    if (!nouveauNom || nouveauPrix === '') return
    setAjout(true)
    await supabase.from('packs_mer').insert({ agence_id: agenceId, nom: nouveauNom, prix: nouveauPrix, actif: true })
    setNouveauNom('')
    setNouveauPrix('')
    setAjout(false)
    charger()
  }

  async function toggleActif(pack: PackMer) {
    await supabase.from('packs_mer').update({ actif: !pack.actif }).eq('id', pack.id)
    charger()
  }

  async function modifierPrix(pack: PackMer, prix: number) {
    if (prix === pack.prix) return
    await supabase.from('packs_mer').update({ prix }).eq('id', pack.id)
    charger()
  }

  if (chargement) return <Skeleton lignes={4} className="max-w-2xl" />

  return (
    <Card className="max-w-2xl">
      <div className="flex flex-col gap-3">
        {packs.map((pack) => (
          <div key={pack.id} className="flex flex-wrap items-center gap-3 border-b border-line pb-3 last:border-0">
            <span className="min-w-32 flex-1">{pack.nom}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                defaultValue={pack.prix}
                onBlur={(e) => modifierPrix(pack, Number(e.target.value))}
                className="w-28"
              />
              <span className="text-text-faint">€</span>
            </div>
            <Toggle checked={pack.actif} onChange={() => toggleActif(pack)} label={`Actif : ${pack.nom}`} />
          </div>
        ))}
        {packs.length === 0 && <p className="text-text-dim">Aucun pack pour l'instant.</p>}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-line pt-6">
        <div>
          <label className="mb-1.5 block text-sm text-text-dim">Nom du pack</label>
          <Input
            value={nouveauNom}
            onChange={(e) => setNouveauNom(e.target.value)}
            placeholder="Pack Sérénité"
            className="w-48"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-text-dim">Prix (€)</label>
          <Input
            type="number"
            value={nouveauPrix}
            onChange={(e) => setNouveauPrix(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-28"
          />
        </div>
        <Button onClick={ajouterPack} disabled={ajout}>
          + Ajouter
        </Button>
      </div>
    </Card>
  )
}
