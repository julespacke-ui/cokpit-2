import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Agence } from '../../types/database'
import { Agences } from './Agences'
import { BaremeHonoraires } from './BaremeHonoraires'
import { PacksMer } from './PacksMer'
import { ExtensionsGarantie } from './ExtensionsGarantie'
import { Comptes } from './Comptes'
import { Objectifs } from './Objectifs'
import { PlansAction } from './PlansAction'
import { Ressources } from './Ressources'
import { SelecteurAgence } from '../../components/ui/SelecteurAgence'
import { agenceParDefaut } from '../../lib/agences'

type Onglet = 'agences' | 'bareme' | 'packs' | 'extensions' | 'comptes' | 'objectifs' | 'plans_action' | 'ressources'

export function ParametresPage() {
  const { profile } = useAuth()
  const estAdmin = profile?.role === 'admin'

  const [onglet, setOnglet] = useState<Onglet>(estAdmin ? 'agences' : 'bareme')
  const [agences, setAgences] = useState<Agence[]>([])
  const [agenceSelectionneeId, setAgenceSelectionneeId] = useState<string>('')

  function rafraichirAgences() {
    supabase
      .from('agences')
      .select('*')
      .order('nom')
      .then(({ data }) => {
        setAgences(data ?? [])
        setAgenceSelectionneeId((prev) => prev || agenceParDefaut(data ?? []))
      })
  }

  useEffect(() => {
    if (!estAdmin) {
      setAgenceSelectionneeId(profile?.agence_id ?? '')
      return
    }
    rafraichirAgences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estAdmin, profile?.agence_id])

  if (!profile) return null

  const onglets: { id: Onglet; label: string }[] = [
    ...(estAdmin ? [{ id: 'agences' as const, label: 'Agences' }] : []),
    { id: 'bareme' as const, label: 'Barème honoraires' },
    { id: 'packs' as const, label: 'Packs MER' },
    { id: 'extensions' as const, label: 'Extensions garantie' },
    { id: 'comptes' as const, label: 'Comptes' },
    { id: 'objectifs' as const, label: 'Objectifs' },
    ...(estAdmin ? [{ id: 'plans_action' as const, label: "Plans d'action" }] : []),
    ...(estAdmin ? [{ id: 'ressources' as const, label: 'Ressources' }] : []),
  ]

  return (
    <div className="p-4 md:p-8">
      <h2 className="mb-4 font-heading text-2xl">Paramètres</h2>

      {/* flex-wrap plutôt que overflow-x-auto : sur mobile, mieux vaut deux
          lignes d'onglets entièrement visibles qu'une scrollbar cachée sans
          indice qu'il y a plus de contenu à droite. */}
      <div className="mb-6 flex flex-wrap gap-x-1 gap-y-2 border-b border-line">
        {onglets.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOnglet(o.id)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors duration-150 ${
              onglet === o.id ? 'border-accent-4 text-text' : 'border-transparent text-text-dim hover:text-text'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {estAdmin && onglet !== 'agences' && (
        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm text-text-dim">Agence :</label>
          <SelecteurAgence agences={agences} value={agenceSelectionneeId} onChange={setAgenceSelectionneeId} />
        </div>
      )}

      <div key={`${onglet}-${agenceSelectionneeId}`} className="animate-page-in">
        {onglet === 'agences' && estAdmin && <Agences agences={agences} onChange={rafraichirAgences} />}
        {onglet === 'bareme' && agenceSelectionneeId && <BaremeHonoraires agenceId={agenceSelectionneeId} />}
        {onglet === 'packs' && agenceSelectionneeId && <PacksMer agenceId={agenceSelectionneeId} />}
        {onglet === 'extensions' && agenceSelectionneeId && <ExtensionsGarantie agenceId={agenceSelectionneeId} />}
        {onglet === 'comptes' && agenceSelectionneeId && (
          <Comptes agenceId={agenceSelectionneeId} peutChoisirRole={estAdmin} agences={agences} />
        )}
        {onglet === 'objectifs' && agenceSelectionneeId && <Objectifs agenceId={agenceSelectionneeId} />}
        {onglet === 'plans_action' && estAdmin && agenceSelectionneeId && (
          <PlansAction agenceId={agenceSelectionneeId} />
        )}
        {onglet === 'ressources' && estAdmin && agenceSelectionneeId && (
          <Ressources agenceId={agenceSelectionneeId} />
        )}

        {onglet !== 'agences' && !agenceSelectionneeId && (
          <p className="text-text-dim">Crée d'abord une agence dans l'onglet "Agences".</p>
        )}
      </div>
    </div>
  )
}
