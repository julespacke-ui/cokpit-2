import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Agence } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function Agences({ agences, onChange }: { agences: Agence[]; onChange: () => void }) {
  const [nom, setNom] = useState('')
  const [ville, setVille] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

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

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <h3 className="mb-4 font-heading text-lg">Agences existantes</h3>
        <div className="flex flex-col gap-2">
          {agences.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-line pb-2 last:border-0">
              <span>{a.nom}</span>
              <span className="text-sm text-text-dim">{a.ville}</span>
            </div>
          ))}
          {agences.length === 0 && <p className="text-text-dim">Aucune agence pour l'instant.</p>}
        </div>
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
