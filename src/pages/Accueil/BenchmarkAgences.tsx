import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  agregerSaisies,
  calculerPanierVente,
  chiffreAffaires,
  honorairesMoyens,
  panierMoyen,
  tauxRotation,
} from '../../lib/calculs'
import type { Agence, Objectif, SaisieHebdo } from '../../types/database'
import { SkeletonTableau } from '../../components/ui/Skeleton'

interface VenteAvecRelations {
  id: string
  agence_id: string
  honoraires_reels: number
  honoraires_preconises: number
  origine_vente: string
  avis_laisse: boolean
  extension_garantie_id: string | null
  packs_mer: { prix: number } | null
  extensions_garantie: { prix_client: number } | null
  vente_services: { prix: number }[]
}

interface LigneBenchmark {
  agence: Agence
  label: string
  ventes: number
  ca: number
  panierMoyen: number
  honorairesMoyens: number
  totalHonoraires: number
  tauxRotation: number
  mandats: number
  objectifAtteint: boolean
}

interface Cibles {
  ventes?: number
  ca_honoraires?: number
  mandats?: number
}

interface BenchmarkAgencesProps {
  du: string
  au: string
}

export function BenchmarkAgences({ du, au }: BenchmarkAgencesProps) {
  const navigate = useNavigate()
  const [lignes, setLignes] = useState<LigneBenchmark[]>([])
  const [lignesDemo, setLignesDemo] = useState<LigneBenchmark[]>([])
  const [demoOuvert, setDemoOuvert] = useState(false)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)

    // Les objectifs sont saisis par mois calendaire : on récupère tous les
    // mois couverts par la période affichée pour cumuler les cibles.
    const moisDebut = `${du.slice(0, 7)}-01`
    const moisFin = `${au.slice(0, 7)}-01`

    Promise.all([
      supabase.from('agences').select('*').order('nom'),
      supabase
        .from('ventes')
        .select(
          'id, agence_id, honoraires_reels, honoraires_preconises, origine_vente, avis_laisse, extension_garantie_id, packs_mer(prix), extensions_garantie(prix_client), vente_services(prix)',
        )
        .gte('date_vente', du)
        .lte('date_vente', au),
      supabase.from('saisies_hebdo').select('*').gte('semaine', du).lte('semaine', au),
      // Stock début de période : dernier stock connu de chaque commercial avant
      // le début de la période (même logique/limite que côté gérant, cf.
      // lib/calculs.ts pour le caveat sur le taux de rotation).
      supabase
        .from('saisies_hebdo')
        .select('commercial_id, agence_id, semaine, stock_total')
        .lt('semaine', du)
        .order('semaine', { ascending: false }),
      supabase
        .from('objectifs')
        .select('*')
        .is('commercial_id', null)
        .gte('periode', moisDebut)
        .lte('periode', moisFin),
    ]).then(([agencesRes, ventesRes, saisiesRes, stockRes, objectifsRes]) => {
      const agences = agencesRes.data ?? []
      const ventes = (ventesRes.data ?? []) as unknown as VenteAvecRelations[]
      const saisies = (saisiesRes.data ?? []) as SaisieHebdo[]
      const objectifs = (objectifsRes.data ?? []) as Objectif[]

      const dernierStockParCommercial = new Map<string, { agenceId: string; stockTotal: number }>()
      for (const s of stockRes.data ?? []) {
        if (!dernierStockParCommercial.has(s.commercial_id)) {
          dernierStockParCommercial.set(s.commercial_id, { agenceId: s.agence_id, stockTotal: s.stock_total })
        }
      }

      const lignesSansLabel = agences.map((agence) => {
        const ventesAgence = ventes.filter((v) => v.agence_id === agence.id)
        const paniers = ventesAgence.map((v) =>
          calculerPanierVente({
            honorairesReels: v.honoraires_reels,
            prixPackMer: v.packs_mer?.prix,
            prixExtensionGarantie: v.extensions_garantie?.prix_client,
            services: v.vente_services ?? [],
          }),
        )
        const saisiesAgence = saisies.filter((s) => s.agence_id === agence.id)
        const agregat = agregerSaisies(saisiesAgence)

        let stockDebut = 0
        for (const { agenceId, stockTotal } of dernierStockParCommercial.values()) {
          if (agenceId === agence.id) stockDebut += stockTotal
        }

        const totalHonoraires = ventesAgence.reduce((somme, v) => somme + v.honoraires_reels, 0)
        const mandats = agregat.mandatsRentres

        // Cumul des cibles agence sur tous les mois couverts par la période.
        const cibles = objectifs
          .filter((o) => o.agence_id === agence.id)
          .reduce<Required<Cibles> & { configure: boolean }>(
            (acc, o) => {
              const c = o.cibles as Cibles
              if (c.ventes !== undefined) {
                acc.ventes += c.ventes
                acc.configure = true
              }
              if (c.ca_honoraires !== undefined) {
                acc.ca_honoraires += c.ca_honoraires
                acc.configure = true
              }
              if (c.mandats !== undefined) {
                acc.mandats += c.mandats
                acc.configure = true
              }
              return acc
            },
            { ventes: 0, ca_honoraires: 0, mandats: 0, configure: false },
          )

        const objectifAtteint =
          cibles.configure &&
          ventesAgence.length >= cibles.ventes &&
          totalHonoraires >= cibles.ca_honoraires &&
          mandats >= cibles.mandats

        return {
          agence,
          ventes: ventesAgence.length,
          ca: chiffreAffaires(paniers),
          panierMoyen: panierMoyen(paniers),
          honorairesMoyens: honorairesMoyens(ventesAgence),
          totalHonoraires,
          tauxRotation: tauxRotation(ventesAgence.length, stockDebut, agregat.stockEntrees),
          mandats,
          objectifAtteint,
        }
      })

      // Classement par CA décroissant : la meilleure agence devient "Agence A".
      // Réelles et démo/test sont classées séparément, chacune sa propre lettre.
      function etiqueter(groupe: Omit<LigneBenchmark, 'label'>[]): LigneBenchmark[] {
        const trie = [...groupe].sort((a, b) => b.ca - a.ca)
        return trie.map((ligne, index) => ({ ...ligne, label: `Agence ${String.fromCharCode(65 + index)}` }))
      }

      setLignes(etiqueter(lignesSansLabel.filter((l) => !l.agence.est_demo)))
      setLignesDemo(etiqueter(lignesSansLabel.filter((l) => l.agence.est_demo)))
      setChargement(false)
    })
  }, [du, au])

  if (chargement) return <SkeletonTableau lignes={5} />
  if (lignes.length === 0 && lignesDemo.length === 0) {
    return <p className="text-text-dim">Aucune agence pour l'instant.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {lignes.length === 0 ? (
        <p className="text-text-dim">Aucune agence cliente pour l'instant.</p>
      ) : (
        <TableBenchmark lignes={lignes} onClickAgence={(id) => navigate(`/agence/${id}`)} />
      )}

      {lignesDemo.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-line bg-bg-elev">
          <button
            type="button"
            onClick={() => setDemoOuvert((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-text-dim transition-colors duration-150 hover:text-text"
          >
            <span>
              Comptes de démo/test ({lignesDemo.length}){' '}
              <span className="text-text-faint">— exclus du benchmark ci-dessus</span>
            </span>
            <span className="text-text-faint">{demoOuvert ? '▲' : '▼'}</span>
          </button>
          {demoOuvert && (
            <div className="animate-page-in border-t border-line p-3">
              <TableBenchmark lignes={lignesDemo} onClickAgence={(id) => navigate(`/agence/${id}`)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TableBenchmark({
  lignes,
  onClickAgence,
}: {
  lignes: LigneBenchmark[]
  onClickAgence: (agenceId: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-bg-elev">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-text-dim">
            <th className="px-4 py-3 font-normal">Agence</th>
            <th className="px-4 py-3 text-right font-normal">Ventes</th>
            <th className="px-4 py-3 text-right font-normal">CA TTC</th>
            <th className="px-4 py-3 text-right font-normal">Panier moyen</th>
            <th className="px-4 py-3 text-right font-normal">Honoraires moyens</th>
            <th className="px-4 py-3 text-right font-normal">Taux de rotation</th>
            <th className="px-4 py-3 text-right font-normal">Mandats</th>
            <th className="px-4 py-3 text-right font-normal">CA généré</th>
            <th className="px-4 py-3 text-right font-normal">Évolution vs baseline</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => {
            const baseline = ligne.agence.ca_baseline
            const ecart = baseline !== null ? ligne.ca - baseline : null
            const ecartPourcent = baseline !== null && baseline !== 0 ? (ecart! / baseline) * 100 : null
            return (
              <tr
                key={ligne.agence.id}
                onClick={() => onClickAgence(ligne.agence.id)}
                className={`cursor-pointer border-b border-l-4 border-line transition-colors duration-150 last:border-0 hover:bg-bg-elev-2 active:bg-bg-elev-2/70 ${
                  ligne.objectifAtteint ? 'border-l-accent-2' : 'border-l-accent-4'
                }`}
              >
                <td className="px-4 py-3">
                  {ligne.agence.nom} <span className="text-text-faint">({ligne.label})</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{ligne.ventes}</td>
                <td className="px-4 py-3 text-right tabular-nums">{ligne.ca.toLocaleString('fr-FR')} €</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {Math.round(ligne.panierMoyen).toLocaleString('fr-FR')} €
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {Math.round(ligne.honorairesMoyens).toLocaleString('fr-FR')} €
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{ligne.tauxRotation.toFixed(1)} %</td>
                <td className="px-4 py-3 text-right tabular-nums">{ligne.mandats}</td>
                <td className="px-4 py-3 text-right tabular-nums">{ligne.ca.toLocaleString('fr-FR')} €</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {ecart === null ? (
                    <span className="text-text-faint">Baseline non définie</span>
                  ) : (
                    <span className={ecart >= 0 ? 'text-accent-2' : 'text-accent-3'}>
                      {ecart >= 0 ? '+' : ''}
                      {Math.round(ecart).toLocaleString('fr-FR')} €
                      {ecartPourcent !== null && ` (${ecart >= 0 ? '+' : ''}${ecartPourcent.toFixed(0)} %)`}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
