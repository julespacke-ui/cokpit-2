import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ExtensionGarantie } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'

export function ExtensionsGarantie({ agenceId }: { agenceId: string }) {
  const [extensions, setExtensions] = useState<ExtensionGarantie[]>([])
  const [chargement, setChargement] = useState(true)
  const [nouveauNom, setNouveauNom] = useState('')
  const [nouveauPrixClient, setNouveauPrixClient] = useState<number | ''>('')
  const [nouvelleCommission, setNouvelleCommission] = useState<number | ''>('')
  const [ajout, setAjout] = useState(false)

  function charger() {
    setChargement(true)
    supabase
      .from('extensions_garantie')
      .select('*')
      .eq('agence_id', agenceId)
      .order('nom')
      .then(({ data }) => {
        setExtensions(data ?? [])
        setChargement(false)
      })
  }

  useEffect(charger, [agenceId])

  async function ajouterExtension() {
    if (!nouveauNom || nouveauPrixClient === '' || nouvelleCommission === '') return
    setAjout(true)
    await supabase.from('extensions_garantie').insert({
      agence_id: agenceId,
      nom: nouveauNom,
      prix_client: nouveauPrixClient,
      commission_agence: nouvelleCommission,
      actif: true,
    })
    setNouveauNom('')
    setNouveauPrixClient('')
    setNouvelleCommission('')
    setAjout(false)
    charger()
  }

  async function toggleActif(ext: ExtensionGarantie) {
    await supabase.from('extensions_garantie').update({ actif: !ext.actif }).eq('id', ext.id)
    charger()
  }

  async function modifierChamp(ext: ExtensionGarantie, champ: 'prix_client' | 'commission_agence', valeur: number) {
    if (valeur === ext[champ]) return
    await supabase.from('extensions_garantie').update({ [champ]: valeur }).eq('id', ext.id)
    charger()
  }

  if (chargement) return <Skeleton lignes={4} className="max-w-2xl" />

  return (
    <Card className="max-w-2xl">
      <div className="flex flex-col gap-3">
        {extensions.map((ext) => (
          <div key={ext.id} className="flex flex-wrap items-center gap-3 border-b border-line pb-3 last:border-0">
            <span className="min-w-32 flex-1">{ext.nom}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-faint">Prix client</span>
              <Input
                type="number"
                defaultValue={ext.prix_client}
                onBlur={(e) => modifierChamp(ext, 'prix_client', Number(e.target.value))}
                className="w-24"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-faint">Commission</span>
              <Input
                type="number"
                defaultValue={ext.commission_agence}
                onBlur={(e) => modifierChamp(ext, 'commission_agence', Number(e.target.value))}
                className="w-24"
              />
            </div>
            <Toggle checked={ext.actif} onChange={() => toggleActif(ext)} label={`Actif : ${ext.nom}`} />
          </div>
        ))}
        {extensions.length === 0 && <p className="text-text-dim">Aucune extension pour l'instant.</p>}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-line pt-6">
        <div>
          <label className="mb-1.5 block text-sm text-text-dim">Nom</label>
          <Input
            value={nouveauNom}
            onChange={(e) => setNouveauNom(e.target.value)}
            placeholder="Garantie 12 mois"
            className="w-44"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-text-dim">Prix client (€)</label>
          <Input
            type="number"
            value={nouveauPrixClient}
            onChange={(e) => setNouveauPrixClient(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-28"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-text-dim">Commission agence (€)</label>
          <Input
            type="number"
            value={nouvelleCommission}
            onChange={(e) => setNouvelleCommission(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-28"
          />
        </div>
        <Button onClick={ajouterExtension} disabled={ajout}>
          + Ajouter
        </Button>
      </div>
    </Card>
  )
}
