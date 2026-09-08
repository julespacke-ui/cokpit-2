import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { calculerPanierVente } from '../../lib/calculs'
import type { BaremeHonoraires, ExtensionGarantie, OrigineVente, PackMer, Profile, TypeTransaction } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { SkeletonTableau } from '../../components/ui/Skeleton'
import { Toast, useToast } from '../../components/ui/Toast'
import { NouvelleVenteForm } from './NouvelleVenteForm'

const ORIGINE_LABELS: Record<string, string> = {
  recommandation: 'Recommandation',
  lead_internet: 'Lead internet',
  reseaux_sociaux: 'Réseaux sociaux',
  prospection: 'Prospection',
  passage: 'Passage',
  liste_chaude: 'Liste chaude',
  autre: 'Autre',
}

const TYPE_TRANSACTION_LABELS: Record<string, string> = {
  depot_vente: 'Dépôt-vente',
  achat_vente: 'Achat-vente',
  export: 'Export',
  import: 'Import',
  courtage: 'Courtage',
  autre: 'Autre',
}

interface VenteLigne {
  id: string
  commercial_id: string
  date_vente: string
  vehicule: string
  prix_vente: number
  honoraires_reels: number
  pack_mer_id: string | null
  pack_mer_prix_applique: number | null
  carte_grise_montant: number
  extension_garantie_id: string | null
  origine_vente: OrigineVente
  type_transaction: TypeTransaction | null
  type_transaction_autre: string | null
  nb_avis: number
  rdv_commercial_id: string | null
  mandat_commercial_id: string | null
  reservation_commercial_id: string | null
  livraison_commercial_id: string | null
  extension_commercial_id: string | null
  vente_services: { libelle: string; prix: number }[]
  panier: number
  commercial: { prenom: string; nom: string } | null
}

function premierJourDuMois(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function aujourdHui(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR')

interface HistoriqueVentesProps {
  agenceId: string
  rafraichir: number
  bareme: BaremeHonoraires | null
  packs: PackMer[]
  extensions: ExtensionGarantie[]
}

export function HistoriqueVentes({ agenceId, rafraichir, bareme, packs, extensions }: HistoriqueVentesProps) {
  const { profile } = useAuth()
  const voitToutesLesVentes = profile?.role === 'gerant' || profile?.role === 'admin'

  const [du, setDu] = useState(premierJourDuMois())
  const [au, setAu] = useState(aujourdHui())
  const [commercialId, setCommercialId] = useState<string>('tous')
  const [commerciaux, setCommerciaux] = useState<Profile[]>([])
  const [ventes, setVentes] = useState<VenteLigne[]>([])
  const [chargement, setChargement] = useState(true)
  const [rafraichirLocal, setRafraichirLocal] = useState(0)
  const [venteEnEditionId, setVenteEnEditionId] = useState<string | null>(null)
  const [suppressionId, setSuppressionId] = useState<string | null>(null)
  const [actionEnCours, setActionEnCours] = useState(false)
  const toast = useToast()

  // Toujours chargée (pas seulement pour gérant/admin) : un commercial édite
  // aussi ses propres ventes et doit pouvoir attribuer chaque étape à
  // n'importe quel collègue de l'agence.
  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('agence_id', agenceId)
      .in('role', ['gerant', 'commercial'])
      .eq('actif', true)
      .order('prenom')
      .then(({ data }) => setCommerciaux(data ?? []))
  }, [agenceId])

  useEffect(() => {
    if (!profile) return
    setChargement(true)

    let requete = supabase
      .from('ventes')
      .select(
        '*, extensions_garantie(prix_client), vente_services(libelle, prix), profiles!ventes_commercial_id_fkey(prenom, nom)',
      )
      .eq('agence_id', agenceId)
      .gte('date_vente', du)
      .lte('date_vente', au)
      .order('date_vente', { ascending: false })

    if (!voitToutesLesVentes) {
      requete = requete.eq('commercial_id', profile.id)
    } else if (commercialId !== 'tous') {
      requete = requete.eq('commercial_id', commercialId)
    }

    requete.then(({ data }) => {
      const lignes: VenteLigne[] = (data ?? []).map((v) => ({
        id: v.id,
        commercial_id: v.commercial_id,
        date_vente: v.date_vente,
        vehicule: v.vehicule,
        prix_vente: v.prix_vente,
        honoraires_reels: v.honoraires_reels,
        pack_mer_id: v.pack_mer_id,
        pack_mer_prix_applique: v.pack_mer_prix_applique,
        carte_grise_montant: v.carte_grise_montant,
        extension_garantie_id: v.extension_garantie_id,
        origine_vente: v.origine_vente,
        type_transaction: v.type_transaction,
        type_transaction_autre: v.type_transaction_autre,
        nb_avis: v.nb_avis,
        rdv_commercial_id: v.rdv_commercial_id,
        mandat_commercial_id: v.mandat_commercial_id,
        reservation_commercial_id: v.reservation_commercial_id,
        livraison_commercial_id: v.livraison_commercial_id,
        extension_commercial_id: v.extension_commercial_id,
        vente_services: v.vente_services ?? [],
        commercial: v.profiles,
        panier: calculerPanierVente({
          honorairesReels: v.honoraires_reels,
          prixPackMer: v.pack_mer_prix_applique ?? undefined,
          prixExtensionGarantie: v.extensions_garantie?.prix_client,
          services: v.vente_services ?? [],
        }),
      }))
      setVentes(lignes)
      setChargement(false)
    })
  }, [agenceId, du, au, commercialId, voitToutesLesVentes, profile, rafraichir, rafraichirLocal])

  async function confirmerSuppression(id: string) {
    setActionEnCours(true)
    const { data, error } = await supabase.from('ventes').delete().eq('id', id).select('id')
    setActionEnCours(false)
    if (error) {
      toast.montrer(error.message)
      return
    }
    if (!data || data.length === 0) {
      toast.montrer("Suppression refusée (droits insuffisants)")
      return
    }
    setSuppressionId(null)
    setRafraichirLocal((r) => r + 1)
    toast.montrer('Vente supprimée')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-sm text-text-dim">Du</label>
          <Input type="date" value={du} onChange={(e) => setDu(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-text-dim">Au</label>
          <Input type="date" value={au} onChange={(e) => setAu(e.target.value)} />
        </div>
        {voitToutesLesVentes && (
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Commercial</label>
            <select
              value={commercialId}
              onChange={(e) => setCommercialId(e.target.value)}
              className="rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
            >
              <option value="tous">Tous</option>
              {commerciaux.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {chargement ? (
        <SkeletonTableau lignes={5} />
      ) : ventes.length === 0 ? (
        <p className="text-text-dim">Aucune vente sur cette période.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {ventes.map((v) =>
            venteEnEditionId === v.id ? (
              <NouvelleVenteForm
                key={v.id}
                agenceId={agenceId}
                peutChoisirCommercial={voitToutesLesVentes}
                bareme={bareme}
                packs={packs}
                extensions={extensions}
                commerciaux={commerciaux}
                venteExistante={v}
                onSauvegarde={() => {
                  setVenteEnEditionId(null)
                  setRafraichirLocal((r) => r + 1)
                  toast.montrer('Vente mise à jour')
                }}
                onCancel={() => setVenteEnEditionId(null)}
              />
            ) : (
              <Card key={v.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{v.vehicule}</p>
                    <p className="text-sm text-text-dim">
                      {FORMAT_DATE.format(new Date(v.date_vente))}
                      {voitToutesLesVentes && v.commercial && ` — ${v.commercial.prenom} ${v.commercial.nom}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">{v.prix_vente.toLocaleString('fr-FR')} €</p>
                    <p className="text-sm text-text-dim">Origine : {ORIGINE_LABELS[v.origine_vente]}</p>
                    {v.type_transaction && (
                      <p className="text-sm text-text-dim">
                        Type :{' '}
                        {v.type_transaction === 'autre' && v.type_transaction_autre
                          ? v.type_transaction_autre
                          : TYPE_TRANSACTION_LABELS[v.type_transaction]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                  <div className="flex flex-wrap gap-4">
                    <span>
                      Honoraires réels :{' '}
                      <strong className="tabular-nums">{v.honoraires_reels.toLocaleString('fr-FR')} €</strong>
                    </span>
                    <span>
                      Panier moyen TTC : <strong className="tabular-nums">{v.panier.toLocaleString('fr-FR')} €</strong>
                    </span>
                    <span>
                      Carte grise :{' '}
                      <strong className="tabular-nums">{v.carte_grise_montant.toLocaleString('fr-FR')} €</strong>
                    </span>
                    <span>Avis reçus : {v.nb_avis}/2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {suppressionId === v.id ? (
                      <>
                        <span className="text-text-dim">Confirmer la suppression ?</span>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => confirmerSuppression(v.id)}
                          disabled={actionEnCours}
                        >
                          Confirmer
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setSuppressionId(null)}>
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="secondary" onClick={() => setVenteEnEditionId(v.id)}>
                          Modifier
                        </Button>
                        <Button type="button" variant="danger" onClick={() => setSuppressionId(v.id)}>
                          Supprimer
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ),
          )}
        </div>
      )}

      <Toast message={toast.message} cle={toast.cle} onFermer={toast.fermer} />
    </div>
  )
}
