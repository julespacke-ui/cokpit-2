import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/database'
import { TableauBordAgence } from './TableauBordAgence'
import { CommercialAccueil } from './CommercialAccueil'
import { MaSemaine } from '../MaSemaine'
import { Skeleton } from '../../components/ui/Skeleton'

/**
 * Vue d'une agence avec bascule vers la vue personnelle de chaque membre de
 * l'équipe — via le sélecteur "Vue :" ou en cliquant une ligne du "Détail
 * par commercial". Même mécanique pour l'admin (n'importe quelle agence,
 * cf. AgenceDetailAdmin) et pour le gérant (sa propre agence, cf.
 * GerantAccueil) : la liste se recalcule à chaque chargement, donc à jour
 * dès qu'un compte est ajouté ou retiré.
 *
 * La "Semaine de {prénom}" y est modifiable (pas juste consultable) : admin
 * et gérant peuvent tous les deux corriger/compléter la saisie d'un membre
 * de leur équipe, autorisé côté RLS pour le gérant sur sa propre agence.
 */
export function AgenceEtEquipe({
  agenceId,
  utilisateurActuelId,
  titreResponsable,
}: {
  agenceId: string
  utilisateurActuelId?: string
  /** Affiché uniquement en vue responsable — masqué en vue commerciale, qui a déjà son propre en-tête. */
  titreResponsable?: ReactNode
}) {
  const [equipe, setEquipe] = useState<Profile[]>([])
  const [chargement, setChargement] = useState(true)
  /** 'responsable' = vue d'ensemble de l'agence ; sinon l'id du profil dont on regarde la vue personnelle. */
  const [vue, setVue] = useState('responsable')

  useEffect(() => {
    setChargement(true)
    setVue('responsable')
    supabase
      .from('profiles')
      .select('*')
      .eq('agence_id', agenceId)
      .in('role', ['gerant', 'commercial'])
      .eq('actif', true)
      .order('prenom')
      .then(({ data }) => {
        setEquipe(data ?? [])
        setChargement(false)
      })
  }, [agenceId])

  const profilVue = vue === 'responsable' ? null : (equipe.find((p) => p.id === vue) ?? null)

  if (chargement) return <Skeleton lignes={4} />

  return (
    <div>
      {!profilVue && titreResponsable}

      {equipe.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
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

      {profilVue ? (
        // CommercialAccueil gère déjà son propre padding (page autonome à la
        // base) : on annule celui du conteneur parent pour ne pas le cumuler.
        <div key={profilVue.id} className="animate-page-in -mx-4 md:-mx-8">
          <CommercialAccueil profile={profilVue} />
          <div className="border-t border-line">
            <MaSemaine profil={profilVue} />
          </div>
        </div>
      ) : (
        <div className="animate-page-in">
          <TableauBordAgence agenceId={agenceId} utilisateurActuelId={utilisateurActuelId} onClickCommercial={setVue} />
        </div>
      )}
    </div>
  )
}
