import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Agence } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'

function LigneAgence({ agence, onChange }: { agence: Agence; onChange: () => void }) {
  const [edition, setEdition] = useState(false)
  const [nom, setNom] = useState(agence.nom)
  const [ville, setVille] = useState(agence.ville ?? '')
  const [estDemo, setEstDemo] = useState(agence.est_demo)
  const [estClient, setEstClient] = useState(agence.est_client)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  function annuler() {
    setNom(agence.nom)
    setVille(agence.ville ?? '')
    setEstDemo(agence.est_demo)
    setEstClient(agence.est_client)
    setErreur(null)
    setEdition(false)
  }

  async function enregistrer() {
    setErreur(null)
    setEnvoiEnCours(true)
    const { error } = await supabase
      .from('agences')
      .update({ nom, ville: ville || null, est_demo: estDemo, est_client: estClient })
      .eq('id', agence.id)
    setEnvoiEnCours(false)
    if (error) {
      setErreur(error.message)
      return
    }
    setEdition(false)
    onChange()
  }

  if (edition) {
    return (
      <div className="flex flex-col gap-2 border-b border-line pb-3 last:border-0">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Nom</label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} className="w-56" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Ville</label>
            <Input value={ville} onChange={(e) => setVille(e.target.value)} className="w-40" />
          </div>
          <Button onClick={enregistrer} disabled={envoiEnCours}>
            {envoiEnCours ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button variant="secondary" onClick={annuler} disabled={envoiEnCours}>
            Annuler
          </Button>
        </div>
        <label className="flex items-center gap-3 text-sm text-text-dim">
          <Toggle checked={estDemo} onChange={setEstDemo} label="Agence de démonstration / test" />
          Agence de démonstration / test — exclue du benchmark inter-agences
        </label>
        <label className="flex items-center gap-3 text-sm text-text-dim">
          <Toggle checked={estClient} onChange={setEstClient} label="Client à moi" />
          Client à moi — sinon simple client Cockpit, exclu du benchmark et de l'évolution de CA
        </label>
        {erreur && <p className="rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">{erreur}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between border-b border-line pb-2 last:border-0">
      <span>{agence.nom}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-dim">{agence.ville}</span>
        <Button variant="secondary" onClick={() => setEdition(true)}>
          Modifier
        </Button>
      </div>
    </div>
  )
}

export function Agences({ agences, onChange }: { agences: Agence[]; onChange: () => void }) {
  const [nom, setNom] = useState('')
  const [ville, setVille] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [demoOuvert, setDemoOuvert] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnvoiEnCours(true)
    const { error } = await supabase.from('agences').insert({ nom, ville: ville || null })
    setEnvoiEnCours(false)
    if (error) {
      setErreur(error.message)
      return
    }
    setNom('')
    setVille('')
    onChange()
  }

  const agencesReelles = agences.filter((a) => !a.est_demo)
  const agencesDemo = agences.filter((a) => a.est_demo)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <h3 className="mb-4 font-heading text-lg">Agences existantes</h3>
        <div className="flex flex-col gap-3">
          {agencesReelles.map((a) => (
            <LigneAgence key={a.id} agence={a} onChange={onChange} />
          ))}
          {agencesReelles.length === 0 && <p className="text-text-dim">Aucune agence pour l'instant.</p>}
        </div>

        {agencesDemo.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setDemoOuvert((v) => !v)}
              className="flex w-full items-center justify-between text-left text-sm text-text-dim transition-colors duration-150 hover:text-text"
            >
              <span>Agences de démonstration / test ({agencesDemo.length})</span>
              <span className="text-text-faint">{demoOuvert ? '▲' : '▼'}</span>
            </button>
            {demoOuvert && (
              <div className="animate-page-in mt-3 flex flex-col gap-3">
                {agencesDemo.map((a) => (
                  <LigneAgence key={a.id} agence={a} onChange={onChange} />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-4 font-heading text-lg">Nouvelle agence</h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Nom</label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} required className="w-56" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Ville</label>
            <Input value={ville} onChange={(e) => setVille(e.target.value)} className="w-40" />
          </div>
          <Button type="submit" disabled={envoiEnCours}>
            {envoiEnCours ? 'Création…' : '+ Créer'}
          </Button>
        </form>
        {erreur && (
          <p className="mt-3 rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">{erreur}</p>
        )}
      </Card>
    </div>
  )
}
