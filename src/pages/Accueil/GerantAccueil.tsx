import { useAuth } from '../../contexts/AuthContext'
import { AgenceEtEquipe } from './AgenceEtEquipe'

export function GerantAccueil() {
  const { profile, agence } = useAuth()
  if (!profile?.agence_id) return null

  return (
    <div className="p-4 md:p-8">
      <AgenceEtEquipe
        agenceId={profile.agence_id}
        utilisateurActuelId={profile.id}
        titreResponsable={
          <>
            <h2 className="mb-1 font-heading text-2xl">Bonjour {profile.prenom}</h2>
            <p className="mb-6 text-text-dim">{agence?.nom}</p>
          </>
        }
      />
    </div>
  )
}
