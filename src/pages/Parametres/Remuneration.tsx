import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ConfigRemuneration } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
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
      <p className="mb-4 text-sm text-text-dim">
        L'extension de garantie n'est pas paramétrable ici : la part versée est toujours 50 % de la commission
        agence définie sur la fiche de l'extension (Paramètres → Extensions de garantie).
      </p>

      <ChampsTauxRemuneration config={config} onChange={setConfig} />

      {message && <p className="mt-4 text-sm text-text-dim">{message}</p>}

      <Button onClick={enregistrer} disabled={enregistrement} className="mt-6">
        {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </Card>
  )
}
