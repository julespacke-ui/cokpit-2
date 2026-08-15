import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { calculerPanierVente } from '../../lib/calculs'
import { couleurSerie } from '../../lib/couleurs'
import { SkeletonCarte } from '../../components/ui/Skeleton'

interface VenteAvecRelations {
  commercial_id: string
  honoraires_reels: number
  pack_mer_prix_applique: number | null
  extensions_garantie: { prix_client: number } | null
  vente_services: { prix: number }[]
}

interface PartCommercial {
  id: string
  nom: string
  ca: number
  pourcentage: number
  couleur: string
}

/** Camembert de répartition du CA par commercial — autre lecture du même
 * classement, en visuel. Le CA suit la même définition que "panier moyen"
 * ailleurs dans l'app : honoraires réels + pack MER + extension + services. */
export function CamembertCA({ agenceId, ventes }: { agenceId: string; ventes: VenteAvecRelations[] }) {
  const [profils, setProfils] = useState<{ id: string; prenom: string; nom: string }[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)
    supabase
      .from('profiles')
      .select('id, prenom, nom')
      .eq('agence_id', agenceId)
      .in('role', ['gerant', 'commercial'])
      .eq('actif', true)
      .then(({ data }) => {
        setProfils(data ?? [])
        setChargement(false)
      })
  }, [agenceId])

  if (chargement) return <SkeletonCarte />

  const totalParPersonne = new Map<string, number>()
  for (const v of ventes) {
    const panier = calculerPanierVente({
      honorairesReels: v.honoraires_reels,
      prixPackMer: v.pack_mer_prix_applique ?? undefined,
      prixExtensionGarantie: v.extensions_garantie?.prix_client,
      services: v.vente_services ?? [],
    })
    totalParPersonne.set(v.commercial_id, (totalParPersonne.get(v.commercial_id) ?? 0) + panier)
  }

  const totalGeneral = [...totalParPersonne.values()].reduce((a, b) => a + b, 0)

  const parts: PartCommercial[] = profils
    .map((p, i) => {
      const ca = totalParPersonne.get(p.id) ?? 0
      return {
        id: p.id,
        nom: `${p.prenom} ${p.nom}`,
        ca,
        pourcentage: totalGeneral > 0 ? (ca / totalGeneral) * 100 : 0,
        couleur: couleurSerie(i),
      }
    })
    .filter((p) => p.ca > 0)
    .sort((a, b) => b.ca - a.ca)

  if (parts.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-[var(--radius-card)] border border-line bg-bg-elev p-6 text-center text-sm text-text-dim">
        Aucune vente sur cette période.
      </div>
    )
  }

  let cumul = 0
  const degrades = parts
    .map((p) => {
      const debut = cumul
      cumul += p.pourcentage
      return `${p.couleur} ${debut}% ${cumul}%`
    })
    .join(', ')

  return (
    <div className="animate-pop-in flex flex-col items-center gap-5 rounded-[var(--radius-card)] border border-line bg-bg-elev p-6">
      <div
        className="h-28 w-28 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${degrades})` }}
        role="img"
        aria-label="Répartition du chiffre d'affaires par commercial"
      />
      <div className="flex w-full flex-col gap-2.5">
        {parts.map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.couleur }} />
            <span className="min-w-0 flex-1 truncate">{p.nom}</span>
            <span className="shrink-0 tabular-nums text-text-dim">
              {Math.round(p.ca).toLocaleString('fr-FR')} € · {p.pourcentage.toFixed(0)} %
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
