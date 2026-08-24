import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { calculerBaseRemuneration, calculerPartExtension, calculerPartRemuneration, tauxEffectif } from '../../lib/calculs'
import type { Agence, ConfigRemuneration, Profile, TypeRemuneration } from '../../types/database'
import { LABELS_TYPE_REMUNERATION } from '../../types/database'
import { Card } from '../../components/ui/Card'
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

/**
 * Parts RDV/mandat/réservation/livraison d'une vente, chacune pour le
 * commercial attribué sur ce champ précis (peut être une personne différente
 * par champ — d'où le résolveur plutôt qu'un config unique pour la vente).
 */
function calculerPartsVente(
  v: VenteRemuneration,
  configAgence: ConfigRemuneration,
  configCommercialPour: (commercialId: string) => ConfigRemuneration | undefined,
) {
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

  return attributions
    .filter((a): a is [string, TypeRemuneration] => a[0] !== null)
    .map(([commercialId, type]) => {
      const taux = tauxEffectif(type, configAgence, configCommercialPour(commercialId))
      return { commercialId, type, montant: calculerPartRemuneration(taux, base) }
    })
}

export function RemunerationPage() {
  const { profile } = useAuth()
  const estAdmin = profile?.role === 'admin'
  const estCommercial = profile?.role === 'commercial'

  const [agences, setAgences] = useState<Agence[]>([])
  const [agenceId, setAgenceId] = useState('')
  const [plage, setPlage] = useState<PlagePeriode | null>(null)
  const [profils, setProfils] = useState<Profile[]>([])
  const [totaux, setTotaux] = useState<Record<string, TotalCommercial>>({})
  const [totalPersonnel, setTotalPersonnel] = useState<TotalCommercial>(totalVide())
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

  // Vue commerciale : uniquement sa propre part, sur les ventes où il apparaît
  // dans un des champs d'attribution — jamais les ventes/taux des collègues.
  useEffect(() => {
    if (!estCommercial || !agenceId || !plage || !profile) return
    setChargement(true)

    Promise.all([
      supabase.from('taux_remuneration_agence').select('*').eq('agence_id', agenceId).maybeSingle(),
      supabase.from('taux_remuneration_commercial').select('*').eq('commercial_id', profile.id).maybeSingle(),
      supabase
        .from('ventes')
        .select(
          'honoraires_reels, pack_mer_prix_applique, vente_services(prix), rdv_commercial_id, mandat_commercial_id, reservation_commercial_id, livraison_commercial_id, extension_commercial_id, extensions_garantie(commission_agence)',
        )
        .eq('agence_id', agenceId)
        .gte('date_vente', plage.du)
        .lte('date_vente', plage.au)
        .or(
          [
            `rdv_commercial_id.eq.${profile.id}`,
            `mandat_commercial_id.eq.${profile.id}`,
            `reservation_commercial_id.eq.${profile.id}`,
            `livraison_commercial_id.eq.${profile.id}`,
            `extension_commercial_id.eq.${profile.id}`,
          ].join(','),
        ),
    ]).then(([agenceTauxRes, commercialTauxRes, ventesRes]) => {
      const configAgence: ConfigRemuneration = agenceTauxRes.data?.config ?? {}
      const configCommercial: ConfigRemuneration | undefined = commercialTauxRes.data?.config
      const ventes = (ventesRes.data ?? []) as unknown as VenteRemuneration[]

      const total = totalVide()
      for (const v of ventes) {
        for (const { commercialId, type, montant } of calculerPartsVente(v, configAgence, () => configCommercial)) {
          if (commercialId !== profile.id) continue
          total[type] += montant
          total.total += montant
        }
        if (v.extension_commercial_id === profile.id && v.extensions_garantie) {
          const part = calculerPartExtension(v.extensions_garantie.commission_agence)
          total.extension += part
          total.total += part
        }
      }

      setTotalPersonnel(total)
      setChargement(false)
    })
  }, [estCommercial, agenceId, plage, profile])

  // Vue gérant/admin : le détail de toute l'équipe de l'agence.
  useEffect(() => {
    if (estCommercial || !agenceId || !plage) return
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

          for (const v of ventes) {
            for (const { commercialId, type, montant } of calculerPartsVente(v, configAgence, (id) =>
              configsCommercial.get(id),
            )) {
              if (!totaux[commercialId]) continue
              totaux[commercialId][type] += montant
              totaux[commercialId].total += montant
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
  }, [estCommercial, agenceId, plage])

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
        <SkeletonTableau lignes={estCommercial ? 2 : 5} />
      ) : estCommercial ? (
        <Card className="max-w-lg">
          <p className="mb-4 text-sm text-text-dim">
            Ta part sur les ventes où tu es attribué (RDV, mandat, réservation, livraison, extension) sur la
            période sélectionnée.
          </p>
          <div className="flex flex-col gap-2">
            {ORDRE_TYPES.map((type) => (
              <div key={type} className="flex items-center justify-between border-b border-line pb-2 text-sm">
                <span className="text-text-dim">Part {LABELS_TYPE_REMUNERATION[type]}</span>
                <span className="tabular-nums">{Math.round(totalPersonnel[type]).toLocaleString('fr-FR')} €</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-b border-line pb-2 text-sm">
              <span className="text-text-dim">Part extension</span>
              <span className="tabular-nums">{Math.round(totalPersonnel.extension).toLocaleString('fr-FR')} €</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-base">
              <span className="font-medium">Total</span>
              <span className="font-medium tabular-nums">{Math.round(totalPersonnel.total).toLocaleString('fr-FR')} €</span>
            </div>
          </div>
        </Card>
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
