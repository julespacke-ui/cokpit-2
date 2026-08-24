import { useEffect, useMemo, useState, type FormEvent } from 'react'
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

interface NouvelleVenteFormProps {
  agenceId: string
  commercialId: string
  bareme: BaremeHonoraires | null
  packs: PackMer[]
  extensions: ExtensionGarantie[]
  commerciaux: Profile[]
  onCreated: () => void
  onCancel: () => void
}

export function NouvelleVenteForm({
  agenceId,
  commercialId,
  bareme,
  packs,
  extensions,
  commerciaux,
  onCreated,
  onCancel,
}: NouvelleVenteFormProps) {
  const [dateVente, setDateVente] = useState(aujourdHui())
  const [vehicule, setVehicule] = useState('')
  const [prixVente, setPrixVente] = useState<number | ''>('')
  const [honorairesReels, setHonorairesReels] = useState<number | ''>('')
  const [honorairesToucheManuel, setHonorairesToucheManuel] = useState(false)
  const [packMerId, setPackMerId] = useState('')
  const [prixMerApplique, setPrixMerApplique] = useState<number | ''>('')
  const [carteGrise, setCarteGrise] = useState<number | ''>('')
  const [extensionGarantieId, setExtensionGarantieId] = useState('')
  const [services, setServices] = useState<{ libelle: string; prix: number }[]>([])
  const [origineVente, setOrigineVente] = useState<OrigineVente | ''>('')
  const [typeTransaction, setTypeTransaction] = useState<TypeTransaction | ''>('')
  const [typeTransactionAutre, setTypeTransactionAutre] = useState('')
  const [nbAvis, setNbAvis] = useState(0)
  const [rdvCommercialId, setRdvCommercialId] = useState('')
  const [mandatCommercialId, setMandatCommercialId] = useState('')
  const [reservationCommercialId, setReservationCommercialId] = useState('')
  const [livraisonCommercialId, setLivraisonCommercialId] = useState('')
  const [extensionCommercialId, setExtensionCommercialId] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const attribution: Record<(typeof CHAMPS_ATTRIBUTION)[number]['cle'], [string, (v: string) => void]> = {
    rdvCommercialId: [rdvCommercialId, setRdvCommercialId],
    mandatCommercialId: [mandatCommercialId, setMandatCommercialId],
    reservationCommercialId: [reservationCommercialId, setReservationCommercialId],
    livraisonCommercialId: [livraisonCommercialId, setLivraisonCommercialId],
  }

  useEffect(() => {
    if (packs.length === 1) setPackMerId(packs[0].id)
  }, [packs])

  const honorairesPreconises = useMemo(() => {
    if (prixVente === '' || !bareme) return 0
    return calculerHonorairesPreconises(Number(prixVente), bareme.config.tranches)
  }, [prixVente, bareme])

  useEffect(() => {
    if (!honorairesToucheManuel) setHonorairesReels(honorairesPreconises)
  }, [honorairesPreconises, honorairesToucheManuel])

  const packSelectionne = packs.find((p) => p.id === packMerId)
  const extensionSelectionnee = extensions.find((e) => e.id === extensionGarantieId)

  // Le prix par défaut du pack se réinitialise à chaque changement de pack
  // sélectionné (y compris désélection), mais reste éditable ensuite si le
  // client a négocié un autre montant.
  useEffect(() => {
    setPrixMerApplique(packSelectionne ? packSelectionne.prix : '')
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

    const { data: vente, error } = await supabase
      .from('ventes')
      .insert({
        commercial_id: commercialId,
        agence_id: agenceId,
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
      })
      .select('id')
      .single()

    if (error || !vente) {
      setEnvoiEnCours(false)
      setErreur(error?.message ?? 'Erreur lors de la création de la vente.')
      return
    }

    if (services.length > 0) {
      const { error: erreurServices } = await supabase
        .from('vente_services')
        .insert(services.map((s) => ({ vente_id: vente.id, libelle: s.libelle, prix: s.prix })))
      if (erreurServices) {
        setEnvoiEnCours(false)
        setErreur(erreurServices.message)
        return
      }
    }

    setEnvoiEnCours(false)
    onCreated()
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
            {envoiEnCours ? 'Création…' : 'Créer la fiche'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  )
}
