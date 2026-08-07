import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { BaremeHonoraires, ExtensionGarantie, PackMer } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { NouvelleVenteForm } from './NouvelleVenteForm'
import { HistoriqueVentes } from './HistoriqueVentes'

export function VentesPage() {
  const { profile } = useAuth()
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [bareme, setBareme] = useState<BaremeHonoraires | null>(null)
  const [packs, setPacks] = useState<PackMer[]>([])
  const [extensions, setExtensions] = useState<ExtensionGarantie[]>([])
  const [rafraichir, setRafraichir] = useState(0)

  useEffect(() => {
    if (!profile?.agence_id) return
    Promise.all([
      supabase.from('baremes_honoraires').select('*').eq('agence_id', profile.agence_id).maybeSingle(),
      supabase.from('packs_mer').select('*').eq('agence_id', profile.agence_id).eq('actif', true).order('nom'),
      supabase
        .from('extensions_garantie')
        .select('*')
        .eq('agence_id', profile.agence_id)
        .eq('actif', true)
        .order('nom'),
    ]).then(([baremeRes, packsRes, extensionsRes]) => {
      setBareme(baremeRes.data)
      setPacks(packsRes.data ?? [])
      setExtensions(extensionsRes.data ?? [])
    })
  }, [profile?.agence_id])

  if (!profile?.agence_id) return null

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl">Ventes</h2>
        {!formulaireOuvert && <Button onClick={() => setFormulaireOuvert(true)}>+ Nouvelle vente</Button>}
      </div>

      {formulaireOuvert && (
        <div className="mb-6">
          <NouvelleVenteForm
            agenceId={profile.agence_id}
            commercialId={profile.id}
            bareme={bareme}
            packs={packs}
            extensions={extensions}
            onCreated={() => {
              setFormulaireOuvert(false)
              setRafraichir((r) => r + 1)
            }}
            onCancel={() => setFormulaireOuvert(false)}
          />
        </div>
      )}

      <HistoriqueVentes agenceId={profile.agence_id} rafraichir={rafraichir} />
    </div>
  )
}
