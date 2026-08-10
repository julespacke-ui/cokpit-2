import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  CATEGORIE_RESSOURCE_LABELS,
  ORDRE_CATEGORIES_RESSOURCE,
  type Agence,
  type Ressource,
} from '../../types/database'
import { Card } from '../../components/ui/Card'

async function ouvrirFichier(storagePath: string) {
  const { data } = await supabase.storage.from('ressources').createSignedUrl(storagePath, 3600)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
}

function ListeRessources({ agenceId }: { agenceId: string }) {
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)
    supabase
      .from('ressources')
      .select('*')
      .or(`agence_id.eq.${agenceId},agence_id.is.null`)
      .order('libelle')
      .then(({ data }) => {
        setRessources(data ?? [])
        setChargement(false)
      })
  }, [agenceId])

  if (chargement) return <p className="text-text-dim">Chargement…</p>
  if (ressources.length === 0) return <p className="text-text-dim">Aucune ressource pour l'instant.</p>

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {ORDRE_CATEGORIES_RESSOURCE.map((cat) => {
        const items = ressources.filter((r) => r.categorie === cat)
        if (items.length === 0) return null
        return (
          <div key={cat}>
            <h3 className="mb-3 font-heading text-lg">{CATEGORIE_RESSOURCE_LABELS[cat]}</h3>
            <div className="flex flex-col gap-2">
              {items.map((r) => (
                <Card key={r.id} className="flex items-center justify-between">
                  <span>
                    {r.libelle}
                    {r.agence_id === null && (
                      <span className="ml-2 text-xs text-text-faint">· Commune</span>
                    )}
                  </span>
                  {r.type === 'lien' ? (
                    <a
                      href={r.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent-5 hover:underline"
                    >
                      Ouvrir →
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => ouvrirFichier(r.storage_path!)}
                      className="text-sm text-accent-5 hover:underline"
                    >
                      Télécharger →
                    </button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function RessourcesPage() {
  const { profile } = useAuth()
  const estAdmin = profile?.role === 'admin'
  const [agences, setAgences] = useState<Agence[]>([])
  const [agenceSelectionneeId, setAgenceSelectionneeId] = useState('')

  useEffect(() => {
    if (!estAdmin) return
    supabase
      .from('agences')
      .select('*')
      .order('nom')
      .then(({ data }) => {
        setAgences(data ?? [])
        setAgenceSelectionneeId((prev) => prev || data?.[0]?.id || '')
      })
  }, [estAdmin])

  if (!profile) return null

  const agenceId = estAdmin ? agenceSelectionneeId : profile.agence_id

  return (
    <div className="p-4 md:p-8">
      <h2 className="mb-4 font-heading text-2xl">Ressources</h2>

      {estAdmin && (
        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm text-text-dim">Agence :</label>
          <select
            value={agenceSelectionneeId}
            onChange={(e) => setAgenceSelectionneeId(e.target.value)}
            className="rounded-lg border border-line bg-bg-elev-2 px-3 py-2 text-sm text-text"
          >
            {agences.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {agenceId ? <ListeRessources agenceId={agenceId} /> : <p className="text-text-dim">Aucune agence sélectionnée.</p>}
    </div>
  )
}
