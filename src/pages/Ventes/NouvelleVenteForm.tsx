import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { calculerHonorairesPreconises, calculerPanierVente } from '../../lib/calculs'
import type {
  BaremeHonoraires,
  ExtensionGarantie,
  OrigineVente,
  PackMer,
  Profile,
  TypeTransaction,
} from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'

const CHAMPS_ATTRIBUTION = [
  { cle: 'rdvCommercialId', label: 'RDV pris' },
  { cle: 'mandatCommercialId', label: 'Mandat rentré' },
  { cle: 'reservationCommercialId', label: 'Véhicule réservé' },
  { cle: 'livraisonCommercialId', label: 'Véhicule livré' },
] as const

const ORIGINES: { valeur: OrigineVente; label: string }[] = [
  { valeur: 'recommandation', label: 'Recommandation' },
  { valeur: 'lead_internet', label: 'Lead internet' },
  { valeur: 'reseaux_sociaux', label: 'Réseaux sociaux' },
  { valeur: 'prospection', label: 'Prospection' },
  { valeur: 'passage', label: 'Passage' },
  { valeur: 'liste_chaude', label: 'Liste chaude' },
  { valeur: 'autre', label: 'Autre' },
]

const TYPES_TRANSACTION: { valeur: TypeTransaction; label: string }[] = [
  { valeur: 'depot_vente', label: 'Dépôt-vente' },
  { valeur: 'achat_vente', label: 'Achat-vente' },
  { valeur: 'export', label: 'Export' },
  { valeur: 'import', label: 'Import' },
  { valeur: 'courtage', label: 'Courtage' },
  { valeur: 'autre', label: 'Autre' },
]

function aujourdHui(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface VenteExistante {
  id: string
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
}

interface NouvelleVenteFormProps {
  agenceId: string
  /** Requis à la création (propriétaire de la vente) ; ignoré en édition. */
  commercialId?: string
  bareme: BaremeHonoraires | null
  packs: PackMer[]
  extensions: ExtensionGarantie[]
  commerciaux: Profile[]
  /** Fournie en mode édition : pré-remplit le formulaire et bascule les
   * boutons/l'envoi sur une mise à jour plutôt qu'une création. */
  venteExistante?: VenteExistante
  onSauvegarde: () => void
  onCancel: () => void
}

export function NouvelleVenteForm({
  agenceId,
  commercialId,
  bareme,
  packs,
  extensions,
  commerciaux,
  venteExistante,
  onSauvegarde,
  onCancel,
}: NouvelleVenteFormProps) {
  const [dateVente, setDateVente] = useState(venteExistante?.date_vente ?? aujourdHui())
  const [vehicule, setVehicule] = useState(venteExistante?.vehicule ?? '')
  const [prixVente, setPrixVente] = useState<number | ''>(venteExistante?.prix_vente ?? '')
  const [honorairesReels, setHonorairesReels] = useState<number | ''>(venteExistante?.honoraires_reels ?? '')
  // En édition, les honoraires chargés sont déjà la valeur réelle négociée :
  // on ne veut jamais les écraser avec le préconisé recalculé du barème actuel.
  const [honorairesToucheManuel, setHonorairesToucheManuel] = useState(!!venteExistante)
  const [packMerId, setPackMerId] = useState(venteExistante?.pack_mer_id ?? '')
  const [prixMerApplique, setPrixMerApplique] = useState<number | ''>(venteExistante?.pack_mer_prix_applique ?? '')
  const [carteGrise, setCarteGrise] = useState<number | ''>(venteExistante?.carte_grise_montant ?? '')
  const [extensionGarantieId, setExtensionGarantieId] = useState(venteExistante?.extension_garantie_id ?? '')
  const [services, setServices] = useState<{ libelle: string; prix: number }[]>(
    venteExistante?.vente_services ?? [],
  )
  const [origineVente, setOrigineVente] = useState<OrigineVente | ''>(venteExistante?.origine_vente ?? '')
  const [typeTransaction, setTypeTransaction] = useState<TypeTransaction | ''>(
    venteExistante?.type_transaction ?? '',
  )
  const [typeTransactionAutre, setTypeTransactionAutre] = useState(venteExistante?.type_transaction_autre ?? '')
  const [nbAvis, setNbAvis] = useState(venteExistante?.nb_avis ?? 0)
  const [rdvCommercialId, setRdvCommercialId] = useState(venteExistante?.rdv_commercial_id ?? '')
  const [mandatCommercialId, setMandatCommercialId] = useState(venteExistante?.mandat_commercial_id ?? '')
  const [reservationCommercialId, setReservationCommercialId] = useState(
    venteExistante?.reservation_commercial_id ?? '',
  )
  const [livraisonCommercialId, setLivraisonCommercialId] = useState(venteExistante?.livraison_commercial_id ?? '')
  const [extensionCommercialId, setExtensionCommercialId] = useState(venteExistante?.extension_commercial_id ?? '')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const attribution: Record<(typeof CHAMPS_ATTRIBUTION)[number]['cle'], [string, (v: string) => void]> = {
    rdvCommercialId: [rdvCommercialId, setRdvCommercialId],
    mandatCommercialId: [mandatCommercialId, setMandatCommercialId],
    reservationCommercialId: [reservationCommercialId, setReservationCommercialId],
    livraisonCommercialId: [livraisonCommercialId, setLivraisonCommercialId],
  }

  useEffect(() => {
    if (!venteExistante && packs.length === 1) setPackMerId(packs[0].id)
  }, [packs, venteExistante])

  const honorairesPreconises = useMemo(() => {
    if (prixVente === '' || !bareme) return 0
    return calculerHonorairesPreconises(Number(prixVente), bareme.config.tranches)
  }, [prixVente, bareme])

  useEffect(() => {
    if (!venteExistante && !honorairesToucheManuel) setHonorairesReels(honorairesPreconises)
  }, [honorairesPreconises, honorairesToucheManuel, venteExistante])

  const packSelectionne = packs.find((p) => p.id === packMerId)
  const extensionSelectionnee = extensions.find((e) => e.id === extensionGarantieId)

  // Le prix par défaut du pack se réinitialise à chaque changement de pack
  // sélectionné (y compris désélection), mais reste éditable ensuite si le
  // client a négocié un autre montant. Le tout premier rendu en édition fait
  // exception : le montant chargé (potentiellement négocié) ne doit pas être
  // écrasé par le prix catalogue juste parce que packMerId vient d'être posé.
  const premierRendu = useRef(true)
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false
      if (venteExistante) return
    }
    setPrixMerApplique(packSelectionne ? packSelectionne.prix : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packMerId])

  const panier = useMemo(
    () =>
      calculerPanierVente({
        honorairesReels: honorairesReels === '' ? 0 : Number(honorairesReels),
        prixPackMer: packSelectionne ? (prixMerApplique === '' ? 0 : Number(prixMerApplique)) : undefined,
        prixExtensionGarantie: extensionSelectionnee?.prix_client,
        services,
      }),
    [honorairesReels, packSelectionne, prixMerApplique, extensionSelectionnee, services],
  )

  function ajouterService() {
    setServices((s) => [...s, { libelle: '', prix: 0 }])
  }

  function modifierService(index: number, changements: Partial<{ libelle: string; prix: number }>) {
    setServices((s) => s.map((service, i) => (i === index ? { ...service, ...changements } : service)))
  }

  function supprimerService(index: number) {
    setServices((s) => s.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErreur(null)

    if (!vehicule || prixVente === '' || honorairesReels === '' || !origineVente) {
      setErreur('Merci de remplir tous les champs obligatoires.')
      return
    }

    setEnvoiEnCours(true)

    const champs = {
      date_vente: dateVente,
      vehicule,
      prix_vente: Number(prixVente),
      honoraires_preconises: honorairesPreconises,
      honoraires_reels: Number(honorairesReels),
      pack_mer_id: packMerId || null,
      pack_mer_prix_applique: packMerId ? (prixMerApplique === '' ? 0 : Number(prixMerApplique)) : null,
      carte_grise_montant: carteGrise === '' ? 0 : Number(carteGrise),
      extension_garantie_id: extensionGarantieId || null,
      origine_vente: origineVente,
      type_transaction: typeTransaction || null,
      type_transaction_autre: typeTransaction === 'autre' ? typeTransactionAutre || null : null,
      nb_avis: nbAvis,
      rdv_commercial_id: rdvCommercialId || null,
      mandat_commercial_id: mandatCommercialId || null,
      reservation_commercial_id: reservationCommercialId || null,
      livraison_commercial_id: livraisonCommercialId || null,
      extension_commercial_id: extensionGarantieId ? extensionCommercialId || null : null,
    }

    let venteId: string

    if (venteExistante) {
      // .select() force le retour des lignes affectées : sans ça, une
      // écriture bloquée par les policies RLS renvoie un tableau vide sans
      // erreur, et on afficherait un succès à tort.
      const { data, error } = await supabase.from('ventes').update(champs).eq('id', venteExistante.id).select('id')
      if (error || !data || data.length === 0) {
        setEnvoiEnCours(false)
        setErreur(error?.message ?? 'Modification refusée (droits insuffisants).')
        return
      }
      venteId = venteExistante.id

      // Les services n'ont pas d'identité propre côté formulaire (pas d'id
      // suivi ligne à ligne) : on remplace tout le lot plutôt que de diffing.
      const { error: erreurSuppr } = await supabase.from('vente_services').delete().eq('vente_id', venteId)
      if (erreurSuppr) {
        setEnvoiEnCours(false)
        setErreur(erreurSuppr.message)
        return
      }
    } else {
      const { data: vente, error } = await supabase
        .from('ventes')
        .insert({ commercial_id: commercialId!, agence_id: agenceId, ...champs })
        .select('id')
        .single()

      if (error || !vente) {
        setEnvoiEnCours(false)
        setErreur(error?.message ?? 'Erreur lors de la création de la vente.')
        return
      }
      venteId = vente.id
    }

    if (services.length > 0) {
      const { error: erreurServices } = await supabase
        .from('vente_services')
        .insert(services.map((s) => ({ vente_id: venteId, libelle: s.libelle, prix: s.prix })))
      if (erreurServices) {
        setEnvoiEnCours(false)
        setErreur(erreurServices.message)
        return
      }
    }

    setEnvoiEnCours(false)
    onSauvegarde()
  }

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm text-text-dim">Date de vente</label>
            <Input type="date" value={dateVente} onChange={(e) => setDateVente(e.target.value)} required />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-sm text-text-dim">Véhicule</label>
            <Input
              value={vehicule}
              onChange={(e) => setVehicule(e.target.value)}
              placeholder="Peugeot 3008"
              required
            />
          </div>
        </div>

        <div className="rounded-lg border border-accent-4/40 bg-accent-4/5 p-3">
          <label className="mb-1.5 block text-sm font-medium text-accent-4">Origine de la vente</label>
          <select
            value={origineVente}
            onChange={(e) => setOrigineVente(e.target.value as OrigineVente)}
            className="w-full rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
            required
          >
            <option value="">Sélectionner…</option>
            {ORIGINES.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-text-dim">Prix de vente (€)</label>
          <Input
            type="number"
            inputMode="numeric"
            value={prixVente}
            onChange={(e) => setPrixVente(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm text-text-dim">Honoraires préconisés</label>
            <Input type="number" value={honorairesPreconises} disabled className="opacity-60" />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-sm text-text-dim">Honoraires réels</label>
            <Input
              type="number"
              inputMode="numeric"
              value={honorairesReels}
              onChange={(e) => {
                setHonorairesToucheManuel(true)
                setHonorairesReels(e.target.value === '' ? '' : Number(e.target.value))
              }}
              required
            />
          </div>
        </div>

        {packs.length === 1 && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 text-sm">
              <Toggle
                checked={packMerId === packs[0].id}
                onChange={(v) => setPackMerId(v ? packs[0].id : '')}
                label={packs[0].nom}
              />
              {packs[0].nom} ({packs[0].prix} €)
            </label>
            {packMerId === packs[0].id && (
              <div>
                <label className="mb-1.5 block text-sm text-text-dim">Montant appliqué (€) — si négocié</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={prixMerApplique}
                  onChange={(e) => setPrixMerApplique(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            )}
          </div>
        )}
        {packs.length > 1 && (
          <div className="flex flex-wrap gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm text-text-dim">Pack mise à la route</label>
              <select
                value={packMerId}
                onChange={(e) => setPackMerId(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
              >
                <option value="">Aucun</option>
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} ({p.prix} €)
                  </option>
                ))}
              </select>
            </div>
            {packMerId && (
              <div className="flex-1">
                <label className="mb-1.5 block text-sm text-text-dim">Montant appliqué (€) — si négocié</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={prixMerApplique}
                  onChange={(e) => setPrixMerApplique(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm text-text-dim">Carte grise (€) — informatif, hors CA</label>
          <Input
            type="number"
            inputMode="numeric"
            value={carteGrise}
            onChange={(e) => setCarteGrise(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        {extensions.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Extension de garantie</label>
            <select
              value={extensionGarantieId}
              onChange={(e) => setExtensionGarantieId(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
            >
              <option value="">Aucune</option>
              {extensions.map((ext) => (
                <option key={ext.id} value={ext.id}>
                  {ext.nom} ({ext.prix_client} €)
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm text-text-dim">Services additionnels</label>
          <div className="flex flex-col gap-2">
            {services.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={s.libelle}
                  onChange={(e) => modifierService(i, { libelle: e.target.value })}
                  placeholder="Libellé"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={s.prix}
                  onChange={(e) => modifierService(i, { prix: Number(e.target.value) })}
                  placeholder="Prix €"
                  className="w-28"
                />
                <Button type="button" variant="danger" onClick={() => supprimerService(i)}>
                  Retirer
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={ajouterService} className="self-start">
              + Ajouter un service
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm text-text-dim">Type de transaction</label>
            <select
              value={typeTransaction}
              onChange={(e) => setTypeTransaction(e.target.value as TypeTransaction)}
              className="w-full rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
            >
              <option value="">Sélectionner…</option>
              {TYPES_TRANSACTION.map((t) => (
                <option key={t.valeur} value={t.valeur}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {typeTransaction === 'autre' && (
            <div className="flex-1">
              <label className="mb-1.5 block text-sm text-text-dim">Précisez</label>
              <Input value={typeTransactionAutre} onChange={(e) => setTypeTransactionAutre(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-text-dim">
            Avis reçus (jusqu'à 2 par vente — acheteur + vendeur)
          </label>
          <select
            value={nbAvis}
            onChange={(e) => setNbAvis(Number(e.target.value))}
            className="w-full rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-text-dim">
            Attribution — qui a réalisé chaque étape (sert au calcul de rémunération, laisser vide si inconnu)
          </label>
          <div className="flex flex-col gap-2">
            {CHAMPS_ATTRIBUTION.map(({ cle, label }) => {
              const [valeur, setValeur] = attribution[cle]
              return (
                <div key={cle} className="flex flex-wrap items-center gap-3">
                  <label className="w-40 shrink-0 text-sm text-text-dim">{label}</label>
                  <select
                    value={valeur}
                    onChange={(e) => setValeur(e.target.value)}
                    className="flex-1 rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
                  >
                    <option value="">—</option>
                    {commerciaux.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
            {extensionGarantieId && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="w-40 shrink-0 text-sm text-text-dim">Extension vendue</label>
                <select
                  value={extensionCommercialId}
                  onChange={(e) => setExtensionCommercialId(e.target.value)}
                  className="flex-1 rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
                >
                  <option value="">—</option>
                  {commerciaux.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-bg-elev-2 px-4 py-3 text-sm">
          Panier moyen TTC de cette vente : <strong className="tabular-nums">{panier.toLocaleString('fr-FR')} €</strong>
        </div>

        {erreur && <p className="rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">{erreur}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={envoiEnCours}>
            {venteExistante
              ? envoiEnCours
                ? 'Enregistrement…'
                : 'Enregistrer les modifications'
              : envoiEnCours
                ? 'Création…'
                : 'Créer la fiche'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  )
}
