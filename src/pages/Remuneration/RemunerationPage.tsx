import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { calculerBaseRemuneration, calculerPartExtension, calculerPartRemuneration, tauxEffectif } from '../../lib/calculs'
import type { Agence, ConfigRemuneration, Profile, TypeRemuneration } from '../../types/database'
import { LABELS_TYPE_REMUNERATION } from '../../types/database'
import { SelecteurAgence } from '../../components/ui/SelecteurAgence'
import { SkeletonTableau } from '../../components/ui/Skeleton'
import { PeriodeSelector, type PlagePeriode } from '../Accueil/PeriodeSelector'
import { agenceParDefaut } from '../../lib/agences'

const ORDRE_TYPES: TypeRemuneration[] = ['rdv', 'mandat', 'reservation', 'livraison']

interface VenteRemuneration {
  honoraires_reels: number
  pack_mer_prix_applique: number | null
  vente_services: { prix: number }[]
  rdv_commercial_id: string | null
  mandat_commercial_id: string | null
  reservation_commercial_id: string | null
  livraison_commercial_id: string | null
  extension_commercial_id: string | null
  extensions_garantie: { commission_agence: number } | null
}

type TotalCommercial = Record<TypeRemuneration, number> & { extension: number; total: number }

function totalVide(): TotalCommercial {
  return { rdv: 0, mandat: 0, reservation: 0, livraison: 0, extension: 0, total: 0 }
}

export function RemunerationPage() {
  const { profile } = useAuth()
  const estAdmin = profile?.role === 'admin'

  const [agences, setAgences] = useState<Agence[]>([])
  const [agenceId, setAgenceId] = useState('')
  const [plage, setPlage] = useState<PlagePeriode | null>(null)
  const [profils, setProfils] = useState<Profile[]>([])
  const [totaux, setTotaux] = useState<Record<string, TotalCommercial>>({})
  const [chargement, setChargement] = useState(true)

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
    if (!agenceId || !plage) return
    setChargement(true)

    Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('agence_id', agenceId)
        .in('role', ['gerant', 'commercial'])
        .eq('actif', true)
        .order('prenom'),
      supabase.from('taux_remuneration_agence').select('*').eq('agence_id', agenceId).maybeSingle(),
      supabase
        .from('ventes')
        .select(
          'honoraires_reels, pack_mer_prix_applique, vente_services(prix), rdv_commercial_id, mandat_commercial_id, reservation_commercial_id, livraison_commercial_id, extension_commercial_id, extensions_garantie(commission_agence)',
        )
        .eq('agence_id', agenceId)
        .gte('date_vente', plage.du)
        .lte('date_vente', plage.au),
    ]).then(([profilsRes, agenceTauxRes, ventesRes]) => {
      const profils = profilsRes.data ?? []
      const configAgence: ConfigRemuneration = agenceTauxRes.data?.config ?? {}
      const ventes = (ventesRes.data ?? []) as unknown as VenteRemuneration[]

      supabase
        .from('taux_remuneration_commercial')
        .select('*')
        .in('commercial_id', profils.map((p) => p.id))
        .then(({ data: commerciauxTauxRes }) => {
          const configsCommercial = new Map<string, ConfigRemuneration>()
          for (const row of commerciauxTauxRes ?? []) {
            configsCommercial.set(row.commercial_id, row.config)
          }

          const totaux: Record<string, TotalCommercial> = {}
          for (const p of profils) totaux[p.id] = totalVide()

          function ajouterPart(commercialId: string | null, type: TypeRemuneration, montant: number) {
            if (!commercialId || !totaux[commercialId]) return
            totaux[commercialId][type] += montant
            totaux[commercialId].total += montant
          }

          for (const v of ventes) {
            const base = calculerBaseRemuneration({
              honorairesReels: v.honoraires_reels,
              prixPackMer: v.pack_mer_prix_applique ?? undefined,
              services: v.vente_services ?? [],
            })

            const attributions: [string | null, TypeRemuneration][] = [
              [v.rdv_commercial_id, 'rdv'],
              [v.mandat_commercial_id, 'mandat'],
              [v.reservation_commercial_id, 'reservation'],
              [v.livraison_commercial_id, 'livraison'],
            ]
            for (const [commercialId, type] of attributions) {
              if (!commercialId) continue
              const taux = tauxEffectif(type, configAgence, configsCommercial.get(commercialId))
              ajouterPart(commercialId, type, calculerPartRemuneration(taux, base))
            }

            if (v.extension_commercial_id && v.extensions_garantie && totaux[v.extension_commercial_id]) {
              const part = calculerPartExtension(v.extensions_garantie.commission_agence)
              totaux[v.extension_commercial_id].extension += part
              totaux[v.extension_commercial_id].total += part
            }
          }

          setProfils(profils)
          setTotaux(totaux)
          setChargement(false)
        })
    })
  }, [agenceId, plage])

  if (!profile) return null

  return (
    <div className="p-4 md:p-8">
      <h2 className="mb-6 font-heading text-2xl">Rémunération</h2>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {estAdmin && <SelecteurAgence agences={agences} value={agenceId} onChange={setAgenceId} />}
        <PeriodeSelector onChange={setPlage} />
      </div>

      {!agenceId ? (
        <p className="text-text-dim">Aucune agence sélectionnée.</p>
      ) : chargement ? (
        <SkeletonTableau lignes={5} />
      ) : profils.length === 0 ? (
        <p className="text-text-dim">Aucun commercial pour l'instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-bg-elev">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-text-dim">
                <th className="sticky left-0 z-10 whitespace-nowrap bg-bg-elev px-4 py-3 font-normal">Commercial</th>
                {ORDRE_TYPES.map((type) => (
                  <th key={type} className="whitespace-nowrap px-4 py-3 text-right font-normal">
                    Part {LABELS_TYPE_REMUNERATION[type]}
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-3 text-right font-normal">Part extension</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {profils.map((p) => {
                const t = totaux[p.id] ?? totalVide()
                return (
                  <tr key={p.id} className="border-b border-line last:border-b-0">
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-bg-elev px-4 py-3">
                      {p.prenom} {p.nom}
                    </td>
                    {ORDRE_TYPES.map((type) => (
                      <td key={type} className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {Math.round(t[type]).toLocaleString('fr-FR')} €
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {Math.round(t.extension).toLocaleString('fr-FR')} €
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                      {Math.round(t.total).toLocaleString('fr-FR')} €
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
