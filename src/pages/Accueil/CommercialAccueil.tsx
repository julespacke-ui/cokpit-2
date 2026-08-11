import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { agregerSaisies, calculerPanierVente, type AgregatSaisies } from '../../lib/calculs'
import { calculerPeriode, toISODate } from '../../lib/periodes'
import type { Objectif, SaisieHebdo } from '../../types/database'
import { JaugeObjectif } from './JaugeObjectif'
import { IndicateursKpi } from './IndicateursKpi'
import { ClassementAgence } from './ClassementAgence'
import { PeriodeSelector, type PlagePeriode } from './PeriodeSelector'
import { SkeletonCarte } from '../../components/ui/Skeleton'

interface VenteAvecRelations {
  id: string
  honoraires_reels: number
  honoraires_preconises: number
  origine_vente: string
  avis_laisse: boolean
  extension_garantie_id: string | null
  packs_mer: { prix: number } | null
  extensions_garantie: { prix_client: number } | null
  vente_services: { prix: number }[]
}

const CIBLES_LABELS: Record<string, { label: string; unite?: string }> = {
  ventes: { label: 'Ventes' },
  ca_honoraires: { label: 'CA honoraires', unite: ' €' },
  rdv_semaine: { label: 'RDV / semaine' },
  mandats: { label: 'Mandats' },
  videos: { label: 'Vidéos' },
}

export function CommercialAccueil() {
  const { profile } = useAuth()
  const [cibles, setCibles] = useState<Record<string, number>>({})
  const [valeursMois, setValeursMois] = useState<Record<string, number>>({})
  const [chargementObjectifs, setChargementObjectifs] = useState(true)

  const [plage, setPlage] = useState<PlagePeriode | null>(null)
  const [agregatPeriode, setAgregatPeriode] = useState<AgregatSaisies | null>(null)
  const [ventesPeriode, setVentesPeriode] = useState<VenteAvecRelations[]>([])
  const [paniersPeriode, setPaniersPeriode] = useState<number[]>([])
  const [stockDebutPeriode, setStockDebutPeriode] = useState(0)
  const [chargementIndicateurs, setChargementIndicateurs] = useState(true)

  // Objectifs du mois : toujours le mois calendaire en cours, indépendant du
  // sélecteur de période utilisé pour les indicateurs ci-dessous.
  useEffect(() => {
    if (!profile) return
    const periodeMois = calculerPeriode('mois', new Date())
    const debutMois = toISODate(periodeMois.debut)
    const finMois = toISODate(periodeMois.fin)

    setChargementObjectifs(true)

    Promise.all([
      supabase.from('objectifs').select('*').eq('commercial_id', profile.id).eq('periode', debutMois).maybeSingle(),
      supabase
        .from('objectifs')
        .select('*')
        .eq('agence_id', profile.agence_id)
        .is('commercial_id', null)
        .eq('periode', debutMois)
        .maybeSingle(),
      supabase
        .from('ventes')
        .select('honoraires_reels')
        .eq('commercial_id', profile.id)
        .gte('date_vente', debutMois)
        .lte('date_vente', finMois),
      supabase
        .from('saisies_hebdo')
        .select('*')
        .eq('commercial_id', profile.id)
        .gte('semaine', debutMois)
        .lte('semaine', finMois),
    ]).then(([objectifPerso, objectifAgence, ventesRes, saisiesRes]) => {
      const objectif = (objectifPerso.data ?? objectifAgence.data) as Objectif | null
      setCibles((objectif?.cibles as Record<string, number>) ?? {})

      const ventes = ventesRes.data ?? []
      const saisies = (saisiesRes.data ?? []) as SaisieHebdo[]
      const agregat = agregerSaisies(saisies)
      const semainesRenseignees = new Set(saisies.map((s) => s.semaine)).size

      setValeursMois({
        ventes: ventes.length,
        ca_honoraires: ventes.reduce((s, v) => s + v.honoraires_reels, 0),
        mandats: agregat.mandatsRentres,
        videos: agregat.videosPostees,
        rdv_semaine: semainesRenseignees > 0 ? agregat.rdvVenus / semainesRenseignees : 0,
      })
      setChargementObjectifs(false)
    })
  }, [profile])

  // Indicateurs calculés sur la période choisie via le sélecteur
  useEffect(() => {
    if (!profile || !plage) return
    setChargementIndicateurs(true)

    Promise.all([
      supabase
        .from('ventes')
        .select(
          'id, honoraires_reels, honoraires_preconises, origine_vente, avis_laisse, extension_garantie_id, packs_mer(prix), extensions_garantie(prix_client), vente_services(prix)',
        )
        .eq('commercial_id', profile.id)
        .gte('date_vente', plage.du)
        .lte('date_vente', plage.au),
      supabase
        .from('saisies_hebdo')
        .select('*')
        .eq('commercial_id', profile.id)
        .gte('semaine', plage.du)
        .lte('semaine', plage.au),
      supabase
        .from('saisies_hebdo')
        .select('stock_total')
        .eq('commercial_id', profile.id)
        .lt('semaine', plage.du)
        .order('semaine', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([ventesRes, saisiesRes, stockRes]) => {
      const ventes = (ventesRes.data ?? []) as unknown as VenteAvecRelations[]
      setVentesPeriode(ventes)
      setPaniersPeriode(
        ventes.map((v) =>
          calculerPanierVente({
            honorairesReels: v.honoraires_reels,
            prixPackMer: v.packs_mer?.prix,
            prixExtensionGarantie: v.extensions_garantie?.prix_client,
            services: v.vente_services ?? [],
          }),
        ),
      )
      setAgregatPeriode(agregerSaisies((saisiesRes.data ?? []) as SaisieHebdo[]))
      setStockDebutPeriode(stockRes.data?.stock_total ?? 0)
      setChargementIndicateurs(false)
    })
  }, [profile, plage])

  if (!profile) return null

  return (
    <div className="p-4 md:p-8">
      <h2 className="mb-1 font-heading text-2xl">Bonjour {profile.prenom}</h2>
      <p className="mb-6 text-text-dim">Voici ton tableau de bord</p>

      <section className="mb-8">
        <h3 className="mb-4 font-heading text-lg">Objectifs du mois</h3>
        {chargementObjectifs ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCarte key={i} />
            ))}
          </div>
        ) : Object.keys(cibles).length === 0 ? (
          <p className="text-text-dim">Aucun objectif défini pour ce mois.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(cibles).map(([cle, cible]) => (
              <JaugeObjectif
                key={cle}
                label={CIBLES_LABELS[cle]?.label ?? cle}
                valeur={valeursMois[cle] ?? 0}
                cible={cible}
                unite={CIBLES_LABELS[cle]?.unite}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h3 className="mb-4 font-heading text-lg">Classement de l'agence</h3>
        {plage && profile.agence_id && (
          <ClassementAgence
            agenceId={profile.agence_id}
            du={plage.du}
            au={plage.au}
            utilisateurActuelId={profile.id}
          />
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-lg">Indicateurs</h3>
          <PeriodeSelector onChange={setPlage} />
        </div>
        {chargementIndicateurs || !agregatPeriode ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCarte key={i} className="p-2.5" />
            ))}
          </div>
        ) : (
          <IndicateursKpi
            agregat={agregatPeriode}
            ventes={ventesPeriode}
            paniers={paniersPeriode}
            stockDebutPeriode={stockDebutPeriode}
          />
        )}
      </section>
    </div>
  )
}
