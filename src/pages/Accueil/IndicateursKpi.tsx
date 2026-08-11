import {
  panierMoyen,
  ratioAvisVentes,
  resistanceHonoraires,
  tauxConversion,
  tauxEntree,
  tauxExtensionGarantie,
  tauxRecommandation,
  tauxRotation,
  type AgregatSaisies,
} from '../../lib/calculs'
import { CompteurAnime } from '../../components/ui/CompteurAnime'

interface VenteIndicateur {
  honoraires_reels: number
  honoraires_preconises: number
  origine_vente: string
  avis_laisse: boolean
  extension_garantie_id: string | null
}

interface IndicateursKpiProps {
  agregat: AgregatSaisies
  ventes: VenteIndicateur[]
  paniers: number[]
  stockDebutPeriode: number
  /** Masque panier moyen / honoraires moyens quand ils sont déjà mis en avant ailleurs sur la page. */
  inclureSynthese?: boolean
}

function StatCard({ label, valeur, unite = '' }: { label: string; valeur: number; unite?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-bg-elev p-2.5">
      <p className="text-xs text-text-dim">{label}</p>
      <p className="mt-0.5 font-heading text-sm tabular-nums">
        <CompteurAnime valeur={valeur} decimales={1} suffixe={unite} />
      </p>
    </div>
  )
}

export function IndicateursKpi({
  agregat,
  ventes,
  paniers,
  stockDebutPeriode,
  inclureSynthese = true,
}: IndicateursKpiProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      <StatCard label="RDV venus / pris" valeur={tauxConversion(agregat.rdvVenus, agregat.rdvPris)} unite=" %" />
      <StatCard label="Taux d'entrée (mandats)" valeur={tauxEntree(agregat.mandatsRentres, agregat.rdvVenus)} unite=" %" />
      <StatCard label="Ventes / visites" valeur={tauxConversion(ventes.length, agregat.visites)} unite=" %" />
      <StatCard
        label="Taux de rotation stock"
        valeur={tauxRotation(ventes.length, stockDebutPeriode, agregat.stockEntrees)}
        unite=" %"
      />
      {inclureSynthese && <StatCard label="Panier moyen TTC" valeur={panierMoyen(paniers)} unite=" €" />}
      <StatCard label="Résistance honoraires" valeur={resistanceHonoraires(ventes)} unite=" %" />
      <StatCard label="Taux extension garantie" valeur={tauxExtensionGarantie(ventes)} unite=" %" />
      <StatCard label="Taux de recommandation" valeur={tauxRecommandation(ventes)} unite=" %" />
      <StatCard label="Avis / ventes" valeur={ratioAvisVentes(ventes)} unite=" %" />
      <StatCard label="Avis Google reçus" valeur={agregat.nbAvisRecus} />
    </div>
  )
}
