import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { calculerPanierVente } from '../../lib/calculs'
import type { Profile } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { SkeletonTableau } from '../../components/ui/Skeleton'
import { Toast, useToast } from '../../components/ui/Toast'

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
  date_vente: string
  vehicule: string
  prix_vente: number
  honoraires_reels: number
  origine_vente: string
  type_transaction: string | null
  type_transaction_autre: string | null
  nb_avis: number
  carte_grise_montant: number
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

export function HistoriqueVentes({ agenceId, rafraichir }: { agenceId: string; rafraichir: number }) {
  const { profile } = useAuth()
  const estGerant = profile?.role === 'gerant'

  const [du, setDu] = useState(premierJourDuMois())
  const [au, setAu] = useState(aujourdHui())
  const [commercialId, setCommercialId] = useState<string>('tous')
  const [commerciaux, setCommerciaux] = useState<Profile[]>([])
  const [ventes, setVentes] = useState<VenteLigne[]>([])
  const [chargement, setChargement] = useState(true)
  const [rafraichirLocal, setRafraichirLocal] = useState(0)
  const [editionId, setEditionId] = useState<string | null>(null)
  const [dateEdition, setDateEdition] = useState('')
  const [suppressionId, setSuppressionId] = useState<string | null>(null)
  const [actionEnCours, setActionEnCours] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!estGerant) return
    supabase
      .from('profiles')
      .select('*')
      .eq('agence_id', agenceId)
      .in('role', ['gerant', 'commercial'])
      .eq('actif', true)
      .order('prenom')
      .then(({ data }) => setCommerciaux(data ?? []))
  }, [agenceId, estGerant])

  useEffect(() => {
    if (!profile) return
    setChargement(true)

    let requete = supabase
      .from('ventes')
      .select('*, extensions_garantie(prix_client), vente_services(prix), profiles(prenom, nom)')
      .eq('agence_id', agenceId)
      .gte('date_vente', du)
      .lte('date_vente', au)
      .order('date_vente', { ascending: false })

    if (!estGerant) {
      requete = requete.eq('commercial_id', profile.id)
    } else if (commercialId !== 'tous') {
      requete = requete.eq('commercial_id', commercialId)
    }

    requete.then(({ data }) => {
      const lignes: VenteLigne[] = (data ?? []).map((v) => ({
        id: v.id,
        date_vente: v.date_vente,
        vehicule: v.vehicule,
        prix_vente: v.prix_vente,
        honoraires_reels: v.honoraires_reels,
        origine_vente: v.origine_vente,
        type_transaction: v.type_transaction,
        type_transaction_autre: v.type_transaction_autre,
        nb_avis: v.nb_avis,
        carte_grise_montant: v.carte_grise_montant,
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
  }, [agenceId, du, au, commercialId, estGerant, profile, rafraichir, rafraichirLocal])

  function ouvrirEdition(v: VenteLigne) {
    setSuppressionId(null)
    setEditionId(v.id)
    setDateEdition(v.date_vente)
  }

  async function enregistrerDate(id: string) {
    setActionEnCours(true)
    // .select() force le retour des lignes affectées : sans ça, une écriture
    // silencieusement bloquée par les policies RLS (droits insuffisants)
    // renvoie un tableau vide sans erreur, et on afficherait un succès à tort.
    const { data, error } = await supabase.from('ventes').update({ date_vente: dateEdition }).eq('id', id).select('id')
    setActionEnCours(false)
    if (error) {
      toast.montrer(error.message)
      return
    }
    if (!data || data.length === 0) {
      toast.montrer("Modification refusée (droits insuffisants)")
      return
    }
    setEditionId(null)
    setRafraichirLocal((r) => r + 1)
    toast.montrer('Date mise à jour')
  }

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
        {estGerant && (
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
          {ventes.map((v) => (
            <Card key={v.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{v.vehicule}</p>
                  {editionId === v.id ? (
                    <Input
                      type="date"
                      value={dateEdition}
                      onChange={(e) => setDateEdition(e.target.value)}
                      className="mt-1 w-auto"
                    />
                  ) : (
                    <p className="text-sm text-text-dim">
                      {FORMAT_DATE.format(new Date(v.date_vente))}
                      {estGerant && v.commercial && ` — ${v.commercial.prenom} ${v.commercial.nom}`}
                    </p>
                  )}
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
                    Honoraires réels : <strong className="tabular-nums">{v.honoraires_reels.toLocaleString('fr-FR')} €</strong>
                  </span>
                  <span>
                    Panier moyen TTC : <strong className="tabular-nums">{v.panier.toLocaleString('fr-FR')} €</strong>
                  </span>
                  <span>
                    Carte grise : <strong className="tabular-nums">{v.carte_grise_montant.toLocaleString('fr-FR')} €</strong>
                  </span>
                  <span>Avis reçus : {v.nb_avis}/2</span>
                </div>
                <div className="flex items-center gap-2">
                  {editionId === v.id ? (
                    <>
                      <Button type="button" onClick={() => enregistrerDate(v.id)} disabled={actionEnCours}>
                        Enregistrer
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditionId(null)}>
                        Annuler
                      </Button>
                    </>
                  ) : suppressionId === v.id ? (
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
                      <Button type="button" variant="secondary" onClick={() => ouvrirEdition(v)}>
                        Modifier la date
                      </Button>
                      <Button type="button" variant="danger" onClick={() => setSuppressionId(v.id)}>
                        Supprimer
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Toast message={toast.message} cle={toast.cle} onFermer={toast.fermer} />
    </div>
  )
}
