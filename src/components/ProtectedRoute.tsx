import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { Role } from '../types/database'

interface ProtectedRouteProps {
  rolesAutorises?: Role[]
}

/**
 * Message bloquant affiché sur place plutôt qu'une redirection : rediriger
 * vers /connexion alors qu'une session valide existe provoquerait un
 * aller-retour infini avec la page de connexion (qui, elle, renvoie vers
 * l'accueil dès qu'il y a une session).
 */
function EcranBloquant({ titre, texte }: { titre: string; texte: string }) {
  const { signOut } = useAuth()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-heading text-xl">{titre}</h1>
      <p className="max-w-sm text-sm text-text-dim">{texte}</p>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-lg bg-accent-4 px-4 py-2.5 text-sm font-medium text-bg"
      >
        Se déconnecter
      </button>
    </div>
  )
}

export function ProtectedRoute({ rolesAutorises }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center text-text-dim">Chargement…</div>
  }

  if (!session) {
    return <Navigate to="/connexion" replace />
  }

  if (!profile) {
    return (
      <EcranBloquant
        titre="Profil introuvable"
        texte="Ton compte existe mais n'est rattaché à aucun profil. Contacte ton administrateur."
      />
    )
  }

  if (!profile.actif) {
    return (
      <EcranBloquant
        titre="Compte désactivé"
        texte="Ton compte a été désactivé. Contacte ton administrateur pour le réactiver."
      />
    )
  }

  if (rolesAutorises && !rolesAutorises.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
