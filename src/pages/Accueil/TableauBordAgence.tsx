import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  agregerSaisies,
  calculerPanierVente,
  chiffreAffaires,
  honorairesMoyens,
  panierMoyen,
  type AgregatSaisies,
} from '../../lib/calculs'
import { calculerPeriode, toISODate } from '../../lib/periodes'
import type { Objectif, SaisieHebdo } from '../../types/database'
import { IndicateursKpi } from './IndicateursKpi'
import { ClassementAgence } from './ClassementAgence'
import { CamembertCA } from './CamembertCA'
import { JaugeObjectif } from './JaugeObjectif'
import { PeriodeSelector, type PlagePeriode } from './PeriodeSelector'
import { SuiviRemplissage } from './SuiviRemplissage'
import { CompteurAnime } from '../../components/ui/CompteurAnime'
import { SkeletonCarte, SkeletonTableau } from '../../components/ui/Skeleton'

const CIBLES_LABELS: Record<string, { label: string; unite?: string }> = {
  ventes: { label: 'Ventes' },
  ca_honoraires: { label: 'CA honoraires', unite: ' €' },
  rdv_semaine: { label: 'RDV / semaine' },
  mandats: { label: 'Mandats' },
  videos: { label: 'Vidéos' },
  avis: { label: 'Avis' },
  extensions_garantie: { label: 'Extensions garantie' },
  prospections: { label: 'Prospections extérieures' },
}

interface VenteAvecRelations {
  id: string
  commercial_id: string
  honoraires_reels: number
  honoraires_preconises: number
  origine_vente: string
  nb_avis: number
  extension_garantie_id: string | null
  pack_mer_prix_applique: number | null
  extensions_garantie: { prix_client: number } | null
  vente_services: { prix: number }[]
}

function StatMiseEnAvant({ label, valeur, unite = '' }: { label: string; valeur: number; unite?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-bg-elev p-6">
      <p className="text-sm text-text-dim">{label}</p>
      <p className="mt-2 font-heading text-3xl tabular-nums">
        <CompteurAnime valeur={valeur} suffixe={unite} />
      </p>
    </div>
  )
}

interface TableauBordAgenceProps {
  agenceId: string
  /** Surligne la ligne de l'utilisateur dans "Détail par commercial" (omis en vue admin). */
  utilisateurActuelId?: string
  /** Clic sur une ligne de "Détail par commercial" pour ouvrir la vue personnelle de ce commercial. */
  onClickCommercial?: (id: string) => void
}

/**
 * Contenu du tableau de bord d'une agence : Vue d'ensemble, Détail par
 * commercial, Suivi des remplissages, Autres indicateurs. Utilisé à la fois
 * pour l'Accueil du gérant (sa propre agence) et pour le drill-down admin
 * depuis le Benchmark inter-agences (n'importe quelle agence).
 */
export function TableauBordAgence({ agenceId, utilisateurActuelId, onClickCommercial }: TableauBordAgenceProps) {
  const [plage, setPlage] = useState<PlagePeriode | null>(null)
  const [agregat, setAgregat] = useState<AgregatSaisies | null>(null)
  const [ventes, setVentes] = useState<VenteAvecRelations[]>([])
  const [paniers, setPaniers] = useState<number[]>([])
  const [stockDebutPeriode, setStockDebutPeriode] = useState(0)
  const [chargement, setChargement] = useState(true)

  const [ciblesAgence, setCiblesAgence] = useState<Record<string, number>>({})
  const [valeursMoisAgence, setValeursMoisAgence] = useState<Record<string, number>>({})
  const [chargementObjectifs, setChargementObjectifs] = useState(true)

  // Objectifs agence : toujours le mois calendaire en cours, indépendant du
  // sélecteur de période utilisé pour le reste de la page (même convention
  // que "Objectifs du mois" sur la vue commerciale).
  useEffect(() => {
    const periodeMois = calculerPeriode('mois', new Date())
    const debutMois = toISODate(periodeMois.debut)
    const finMois = toISODate(periodeMois.fin)

    setChargementObjectifs(true)

    Promise.all([
      // .lte + order + limit(1) plutôt que .eq('periode', debutMois) :
      // reconduction automatique tant qu'aucune ligne plus récente n'existe.
      supabase
        .from('objectifs')
        .select('*')
        .eq('agence_id', agenceId)
        .is('commercial_id', null)
        .lte('periode', debutMois)
        .order('periode', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('ventes')
        .select('honoraires_reels, extension_garantie_id')
        .eq('agence_id', agenceId)
        .gte('date_vente', debutMois)
        .lte('date_vente', finMois),
      supabase
        .from('saisies_hebdo')
        .select('*')
        .eq('agence_id', agenceId)
        .gte('semaine', debutMois)
        .lte('semaine', finMois),
    ]).then(([objectifRes, ventesRes, saisiesRes]) => {
      const objectif = objectifRes.data as Objectif | null
      setCiblesAgence((objectif?.cibles as Record<string, number>) ?? {})

      const ventes = ventesRes.data ?? []
      const saisies = (saisiesRes.data ?? []) as SaisieHebdo[]
      const agregat = agregerSaisies(saisies)
      const semainesRenseignees = new Set(saisies.map((s) => s.semaine)).size

      setValeursMoisAgence({
        ventes: ventes.length,
        ca_honoraires: ventes.reduce((s, v) => s + v.honoraires_reels, 0),
        mandats: agregat.mandatsRentres,
        videos: agregat.videosPostees,
        rdv_semaine: semainesRenseignees > 0 ? agregat.rdvVenus / semainesRenseignees : 0,
        avis: agregat.nbAvisRecus,
        prospections: agregat.prospectionsExterieures,
        extensions_garantie: ventes.filter((v) => v.extension_garantie_id !== null).length,
      })
      setChargementObjectifs(false)
    })
  }, [agenceId])

  useEffect(() => {
    if (!plage) return
    setChargement(true)

    Promise.all([
      supabase
        .from('ventes')
        .select(
          'id, commercial_id, honoraires_reels, honoraires_preconises, origine_vente, nb_avis, extension_garantie_id, pack_mer_prix_applique, extensions_garantie(prix_client), vente_services(prix)',
        )
        .eq('agence_id', agenceId)
        .gte('date_vente', plage.du)
        .lte('date_vente', plage.au),
      supabase
        .from('saisies_hebdo')
        .select('*')
        .eq('agence_id', agenceId)
        .gte('semaine', plage.du)
        .lte('semaine', plage.au),
      // Stock début de période : dernière valeur connue de chaque commercial avant
      // le début de la période, sommée. Si plusieurs commerciaux déclarent le même
      // stock physique d'agence, ce total peut être en doublon — à affiner une fois
      // l'usage réel observé (cf. taux de rotation dans lib/calculs.ts).
      supabase
        .from('saisies_hebdo')
        .select('commercial_id, semaine, stock_total')
        .eq('agence_id', agenceId)
        .lt('semaine', plage.du)
        .order('semaine', { ascending: false }),
    ]).then(([ventesRes, saisiesRes, stockRes]) => {
      const ventesData = (ventesRes.data ?? []) as unknown as VenteAvecRelations[]
      setVentes(ventesData)
      setPaniers(
        ventesData.map((v) =>
          calculerPanierVente({
            honorairesReels: v.honoraires_reels,
            prixPackMer: v.pack_mer_prix_applique ?? undefined,
            prixExtensionGarantie: v.extensions_garantie?.prix_client,
            services: v.vente_services ?? [],
          }),
        ),
      )
      setAgregat(agregerSaisies((saisiesRes.data ?? []) as SaisieHebdo[]))

      const dernierParCommercial = new Map<string, number>()
      for (const s of stockRes.data ?? []) {
        if (!dernierParCommercial.has(s.commercial_id)) {
          dernierParCommercial.set(s.commercial_id, s.stock_total)
        }
      }
      setStockDebutPeriode([...dernierParCommercial.values()].reduce((a, b) => a + b, 0))
      setChargement(false)
    })
  }, [agenceId, plage])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg">Vue d'ensemble</h3>
        <PeriodeSelector onChange={setPlage} />
      </div>

      {chargement || !agregat ? (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCarte />
            <SkeletonCarte />
            <SkeletonCarte />
          </div>
          <SkeletonTableau />
        </div>
      ) : (
        <div className="animate-page-in">
          <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatMiseEnAvant label="Chiffre d'affaires TTC" valeur={chiffreAffaires(paniers)} unite=" €" />
            <StatMiseEnAvant label="Panier moyen TTC" valeur={panierMoyen(paniers)} unite=" €" />
            <StatMiseEnAvant label="Honoraires moyens" valeur={honorairesMoyens(ventes)} unite=" €" />
          </section>

          <section className="mb-8">
            <h3 className="mb-4 font-heading text-lg">Objectifs agence — mois en cours</h3>
            {chargementObjectifs ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCarte key={i} />
                ))}
              </div>
            ) : Object.keys(ciblesAgence).length === 0 ? (
              <p className="text-text-dim">Aucun objectif agence défini.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Object.entries(ciblesAgence).map(([cle, cible]) => (
                  <JaugeObjectif
                    key={cle}
                    label={CIBLES_LABELS[cle]?.label ?? cle}
                    valeur={valeursMoisAgence[cle] ?? 0}
                    cible={cible}
                    unite={CIBLES_LABELS[cle]?.unite}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mb-8">
            <h3 className="mb-4 font-heading text-lg">Détail par commercial</h3>
            {plage && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
                <ClassementAgence
                  agenceId={agenceId}
                  du={plage.du}
                  au={plage.au}
                  utilisateurActuelId={utilisateurActuelId}
                  onClickCommercial={onClickCommercial}
                />
                <CamembertCA agenceId={agenceId} ventes={ventes} />
              </div>
            )}
          </section>

          <section className="mb-8">
            <h3 className="mb-4 font-heading text-lg">Suivi des remplissages</h3>
            <SuiviRemplissage agenceId={agenceId} />
          </section>

          <section>
            <h3 className="mb-4 font-heading text-lg">Autres indicateurs</h3>
            <IndicateursKpi
              agregat={agregat}
              ventes={ventes}
              paniers={paniers}
              stockDebutPeriode={stockDebutPeriode}
              inclureSynthese={false}
            />
          </section>
        </div>
      )}
    </div>
  )
}
