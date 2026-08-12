import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Agence, Profile } from '../../types/database'
import { TableauBordAgence } from './TableauBordAgence'
import { CommercialAccueil } from './CommercialAccueil'
import { Skeleton } from '../../components/ui/Skeleton'

export function AgenceDetailAdmin() {
  const { agenceId } = useParams<{ agenceId: string }>()
  const [agence, setAgence] = useState<Agence | null>(null)
  const [equipe, setEquipe] = useState<Profile[]>([])
  const [chargement, setChargement] = useState(true)
  /** 'responsable' = vue d'ensemble de l'agence ; sinon l'id du profil dont on regarde la vue personnelle. */
  const [vue, setVue] = useState('responsable')

  useEffect(() => {
    if (!agenceId) return
    setChargement(true)
    setVue('responsable')
    Promise.all([
      supabase.from('agences').select('*').eq('id', agenceId).maybeSingle(),
      supabase
        .from('profiles')
        .select('*')
        .eq('agence_id', agenceId)
        .in('role', ['gerant', 'commercial'])
        .eq('actif', true)
        .order('prenom'),
    ]).then(([agenceRes, profilsRes]) => {
      setAgence(agenceRes.data)
      setEquipe(profilsRes.data ?? [])
      setChargement(false)
    })
  }, [agenceId])

  if (!agenceId) return null

  const profilVue = vue === 'responsable' ? null : (equipe.find((p) => p.id === vue) ?? null)

  return (
    <div className="p-4 md:p-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-text-dim hover:text-text">
        <ArrowLeft size={16} />
        Retour au benchmark
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="mb-1 font-heading text-2xl">{chargement ? 'Chargement…' : agence?.nom}</h2>
          <p className="text-text-dim">Vue admin — identique à ce que voit la personne sélectionnée</p>
        </div>

        {!chargement && equipe.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-dim">Vue :</label>
            <select
              value={vue}
              onChange={(e) => setVue(e.target.value)}
              className="rounded-lg border border-line bg-bg-elev-2 px-3 py-2 text-sm text-text"
            >
              <option value="responsable">Vue responsable d'agence</option>
              {equipe.map((p) => (
                <option key={p.id} value={p.id}>
                  Vue commerciale — {p.prenom} {p.nom}
                  {p.role === 'gerant' ? ' (gérant)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {chargement ? (
        <Skeleton lignes={4} />
      ) : (
        agence &&
        (profilVue ? (
          // CommercialAccueil gère déjà son propre padding (page autonome à
          // la base) : on annule celui du conteneur ici pour ne pas le cumuler.
          <div key={profilVue.id} className="animate-page-in -mx-4 md:-mx-8">
            <CommercialAccueil profile={profilVue} />
          </div>
        ) : (
          <div className="animate-page-in">
            <TableauBordAgence agenceId={agence.id} />
          </div>
        ))
      )}
    </div>
  )
}
