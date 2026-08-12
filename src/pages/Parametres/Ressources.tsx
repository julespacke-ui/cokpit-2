import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { CATEGORIE_RESSOURCE_LABELS, ORDRE_CATEGORIES_RESSOURCE, type CategorieRessource, type Ressource } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

function LigneRessource({ ressource, onChange }: { ressource: Ressource; onChange: () => void }) {
  const [edition, setEdition] = useState(false)
  const [libelle, setLibelle] = useState(ressource.libelle)
  const [categorie, setCategorie] = useState(ressource.categorie)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  function annuler() {
    setLibelle(ressource.libelle)
    setCategorie(ressource.categorie)
    setErreur(null)
    setEdition(false)
  }

  async function enregistrer() {
    if (!libelle) {
      setErreur('Le libellé est obligatoire.')
      return
    }
    setErreur(null)
    setEnvoiEnCours(true)
    const { error } = await supabase.from('ressources').update({ libelle, categorie }).eq('id', ressource.id)
    setEnvoiEnCours(false)
    if (error) {
      setErreur(error.message)
      return
    }
    setEdition(false)
    onChange()
  }

  async function supprimer() {
    if (ressource.storage_path) {
      await supabase.storage.from('ressources').remove([ressource.storage_path])
    }
    await supabase.from('ressources').delete().eq('id', ressource.id)
    onChange()
  }

  if (edition) {
    return (
      <div className="flex flex-col gap-2 border-b border-line pb-3 last:border-0">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <label className="mb-1.5 block text-sm text-text-dim">Libellé</label>
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Catégorie</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as CategorieRessource)}
              className="rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
            >
              {ORDRE_CATEGORIES_RESSOURCE.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {CATEGORIE_RESSOURCE_LABELS[valeur]}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={enregistrer} disabled={envoiEnCours}>
            {envoiEnCours ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button variant="secondary" onClick={annuler} disabled={envoiEnCours}>
            Annuler
          </Button>
        </div>
        {erreur && <p className="rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">{erreur}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line pb-3 last:border-0">
      <span className="min-w-40 flex-1">
        {ressource.libelle}
        <span className="ml-2 text-xs text-text-faint">
          {CATEGORIE_RESSOURCE_LABELS[ressource.categorie]} · {ressource.type === 'lien' ? 'Lien' : 'Fichier'}
          {ressource.agence_id === null && ' · Commune à tous les points de vente'}
        </span>
      </span>
      <Button type="button" variant="secondary" onClick={() => setEdition(true)}>
        Modifier
      </Button>
      <Button type="button" variant="danger" onClick={supprimer}>
        Supprimer
      </Button>
    </div>
  )
}

export function Ressources({ agenceId }: { agenceId: string }) {
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [chargement, setChargement] = useState(true)

  const [type, setType] = useState<'lien' | 'fichier'>('lien')
  const [portee, setPortee] = useState<'agence' | 'commune'>('agence')
  const [libelle, setLibelle] = useState('')
  const [categorie, setCategorie] = useState<CategorieRessource>('autre')
  const [url, setUrl] = useState('')
  const [fichier, setFichier] = useState<File | null>(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  function charger() {
    setChargement(true)
    supabase
      .from('ressources')
      .select('*')
      .or(`agence_id.eq.${agenceId},agence_id.is.null`)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRessources(data ?? [])
        setChargement(false)
      })
  }

  useEffect(charger, [agenceId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErreur(null)

    if (!libelle) {
      setErreur('Le libellé est obligatoire.')
      return
    }
    if (type === 'lien' && !url) {
      setErreur("L'URL est obligatoire pour un lien.")
      return
    }
    if (type === 'fichier' && !fichier) {
      setErreur('Choisis un fichier.')
      return
    }

    setEnvoiEnCours(true)

    const dossier = portee === 'commune' ? 'commun' : agenceId

    let storagePath: string | null = null
    if (type === 'fichier' && fichier) {
      storagePath = `${dossier}/${Date.now()}-${fichier.name}`
      const { error: erreurUpload } = await supabase.storage.from('ressources').upload(storagePath, fichier)
      if (erreurUpload) {
        setEnvoiEnCours(false)
        setErreur(erreurUpload.message)
        return
      }
    }

    const { error: erreurTable } = await supabase.from('ressources').insert({
      agence_id: portee === 'commune' ? null : agenceId,
      type,
      libelle,
      url: type === 'lien' ? url : null,
      storage_path: type === 'fichier' ? storagePath : null,
      categorie,
    })

    setEnvoiEnCours(false)
    if (erreurTable) {
      setErreur(erreurTable.message)
      return
    }

    setLibelle('')
    setUrl('')
    setFichier(null)
    charger()
  }

  if (chargement) return <Skeleton lignes={4} className="max-w-2xl" />

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <h3 className="mb-4 font-heading text-lg">Ressources existantes</h3>
        <div className="flex flex-col gap-3">
          {ressources.map((r) => (
            <LigneRessource key={r.id} ressource={r} onChange={charger} />
          ))}
          {ressources.length === 0 && <p className="text-text-dim">Aucune ressource pour l'instant.</p>}
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-heading text-lg">Nouvelle ressource</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('lien')}
              className={`rounded-lg px-4 py-2 text-sm ${type === 'lien' ? 'bg-accent-4 text-bg' : 'bg-bg-elev-2 text-text-dim'}`}
            >
              Lien
            </button>
            <button
              type="button"
              onClick={() => setType('fichier')}
              className={`rounded-lg px-4 py-2 text-sm ${type === 'fichier' ? 'bg-accent-4 text-bg' : 'bg-bg-elev-2 text-text-dim'}`}
            >
              Fichier
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Visibilité</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPortee('agence')}
                className={`rounded-lg px-4 py-2 text-sm ${portee === 'agence' ? 'bg-accent-4 text-bg' : 'bg-bg-elev-2 text-text-dim'}`}
              >
                Ce point de vente uniquement
              </button>
              <button
                type="button"
                onClick={() => setPortee('commune')}
                className={`rounded-lg px-4 py-2 text-sm ${portee === 'commune' ? 'bg-accent-4 text-bg' : 'bg-bg-elev-2 text-text-dim'}`}
              >
                Commune à tous les points de vente
              </button>
            </div>
          </div>

          <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Libellé" required />

          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value as CategorieRessource)}
            className="rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
          >
            {ORDRE_CATEGORIES_RESSOURCE.map((valeur) => (
              <option key={valeur} value={valeur}>
                {CATEGORIE_RESSOURCE_LABELS[valeur]}
              </option>
            ))}
          </select>

          {type === 'lien' ? (
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          ) : (
            <label className="cursor-pointer self-start rounded-lg border border-line bg-bg-elev-2 px-4 py-2.5 text-sm font-medium text-text transition-colors duration-150 hover:bg-line">
              {fichier ? fichier.name : 'Choisir un fichier'}
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

          {erreur && <p className="rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">{erreur}</p>}

          <Button type="submit" disabled={envoiEnCours} className="self-start">
            {envoiEnCours ? 'Ajout…' : '+ Ajouter'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
