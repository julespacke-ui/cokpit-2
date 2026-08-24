import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ConfigRemuneration } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ChampsTauxRemuneration } from '../../components/ui/ChampsTauxRemuneration'

const TAUX_PAR_DEFAUT: ConfigRemuneration = {
  rdv: { mode: 'pourcentage', valeur: 5 },
  mandat: { mode: 'pourcentage', valeur: 10 },
  reservation: { mode: 'pourcentage', valeur: 10 },
  livraison: { mode: 'pourcentage', valeur: 5 },
}

export function Remuneration({ agenceId }: { agenceId: string }) {
  const [chargement, setChargement] = useState(true)
  const [config, setConfig] = useState<ConfigRemuneration>(TAUX_PAR_DEFAUT)
  const [message, setMessage] = useState<string | null>(null)
  const [enregistrement, setEnregistrement] = useState(false)

  useEffect(() => {
    setChargement(true)
    setMessage(null)
    supabase
      .from('taux_remuneration_agence')
      .select('*')
      .eq('agence_id', agenceId)
      .maybeSingle()
      .then(({ data }) => {
        setConfig(data?.config && Object.keys(data.config).length > 0 ? data.config : TAUX_PAR_DEFAUT)
        setChargement(false)
      })
  }, [agenceId])

  async function enregistrer() {
    setEnregistrement(true)
    setMessage(null)
    const { error } = await supabase
      .from('taux_remuneration_agence')
      .upsert({ agence_id: agenceId, config }, { onConflict: 'agence_id' })
    setEnregistrement(false)
    setMessage(error ? `Erreur : ${error.message}` : 'Taux enregistrés.')
  }

  if (chargement) return <Skeleton lignes={4} className="max-w-2xl" />

  return (
    <Card className="max-w-3xl">
      <p className="mb-4 text-sm text-text-dim">
        Taux par défaut appliqués sur le panier de la vente hors carte grise et hors extension de garantie
        (honoraires réels + pack MER + services additionnels), pour chaque commercial attribué sur une fiche
        vente. Chaque taux est un pourcentage de cette base ou une prime fixe, au choix. Un commercial peut avoir
        des taux personnalisés (Paramètres → Comptes) qui remplacent ceux-ci un par un.
      </p>
      <ChampsTauxRemuneration config={config} onChange={setConfig} />

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <label className="w-40 shrink-0 text-sm text-text-dim">Extension de garantie</label>
        <select disabled value="pourcentage" className="rounded-lg border border-line bg-bg-elev-2 px-3 py-3 text-sm text-text opacity-60">
          <option value="pourcentage">Pourcentage</option>
        </select>
        <Input value="50" disabled className="w-28 opacity-60" />
        <span className="text-text-faint">%</span>
        <span className="text-sm text-text-faint">
          de la commission agence de l'extension vendue — pas du panier ci-dessus, non modifiable
        </span>
      </div>

      {message && <p className="mt-4 text-sm text-text-dim">{message}</p>}

      <Button onClick={enregistrer} disabled={enregistrement} className="mt-6">
        {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </Card>
  )
}
