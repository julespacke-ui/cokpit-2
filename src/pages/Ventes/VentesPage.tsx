import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Agence, BaremeHonoraires, ExtensionGarantie, PackMer, Profile } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { Toast, useToast } from '../../components/ui/Toast'
import { SelecteurAgence } from '../../components/ui/SelecteurAgence'
import { agenceParDefaut } from '../../lib/agences'
import { NouvelleVenteForm } from './NouvelleVenteForm'
import { HistoriqueVentes } from './HistoriqueVentes'

export function VentesPage() {
  const { profile } = useAuth()
  const estAdmin = profile?.role === 'admin'

  const [agences, setAgences] = useState<Agence[]>([])
  const [agenceId, setAgenceId] = useState('')
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [bareme, setBareme] = useState<BaremeHonoraires | null>(null)
  const [packs, setPacks] = useState<PackMer[]>([])
  const [extensions, setExtensions] = useState<ExtensionGarantie[]>([])
  const [commerciaux, setCommerciaux] = useState<Profile[]>([])
  const [rafraichir, setRafraichir] = useState(0)
  const toast = useToast()

  useEffect(() => {
    if (!estAdmin) {
      setAgenceId(profile?.agence_id ?? '')
      return
    }
    supabase
      .from('agences')
      .select('*')
      .order('nom')
      .then(({ data }) => {
        setAgences(data ?? [])
        setAgenceId((prev) => prev || agenceParDefaut(data ?? []))
      })
  }, [estAdmin, profile?.agence_id])

  useEffect(() => {
    if (!agenceId) return
    Promise.all([
      supabase.from('baremes_honoraires').select('*').eq('agence_id', agenceId).maybeSingle(),
      supabase.from('packs_mer').select('*').eq('agence_id', agenceId).eq('actif', true).order('nom'),
      supabase
        .from('extensions_garantie')
        .select('*')
        .eq('agence_id', agenceId)
        .eq('actif', true)
        .order('nom'),
      supabase
        .from('profiles')
        .select('*')
        .eq('agence_id', agenceId)
        .in('role', ['gerant', 'commercial'])
        .eq('actif', true)
        .order('prenom'),
    ]).then(([baremeRes, packsRes, extensionsRes, commerciauxRes]) => {
      setBareme(baremeRes.data)
      setPacks(packsRes.data ?? [])
      setExtensions(extensionsRes.data ?? [])
      setCommerciaux(commerciauxRes.data ?? [])
    })
  }, [agenceId])

  if (!profile || !agenceId) return null

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl">Ventes</h2>
        <div className="flex items-center gap-3">
          {estAdmin && <SelecteurAgence agences={agences} value={agenceId} onChange={setAgenceId} />}
          {!estAdmin && !formulaireOuvert && (
            <Button onClick={() => setFormulaireOuvert(true)}>+ Nouvelle vente</Button>
          )}
        </div>
      </div>

      {!estAdmin && formulaireOuvert && (
        <div className="mb-6">
          <NouvelleVenteForm
            agenceId={agenceId}
            commercialId={profile.id}
            bareme={bareme}
            packs={packs}
            extensions={extensions}
            commerciaux={commerciaux}
            onSauvegarde={() => {
              setFormulaireOuvert(false)
              setRafraichir((r) => r + 1)
              toast.montrer('Vente enregistrée')
            }}
            onCancel={() => setFormulaireOuvert(false)}
          />
        </div>
      )}

      <HistoriqueVentes
        key={agenceId}
        agenceId={agenceId}
        rafraichir={rafraichir}
        bareme={bareme}
        packs={packs}
        extensions={extensions}
      />

      <Toast message={toast.message} cle={toast.cle} onFermer={toast.fermer} />
    </div>
  )
}
