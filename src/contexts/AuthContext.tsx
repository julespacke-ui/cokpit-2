import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Agence, Profile } from '../types/database'

interface AuthState {
  session: Session | null
  profile: Profile | null
  agence: Agence | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

function traduireErreurConnexion(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Email ou mot de passe incorrect.'
  }
  return "Une erreur est survenue lors de la connexion."
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [agence, setAgence] = useState<Agence | null>(null)
  const [loading, setLoading] = useState(true)

  // Miroir du profil lisible depuis le callback d'authentification, dont la
  // closure ne voit sinon que la valeur initiale de l'état.
  const profilCharge = useRef<string | null>(null)

  async function chargerProfil(userId: string) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(profileData ?? null)
    profilCharge.current = profileData?.id ?? null

    if (profileData?.agence_id) {
      const { data: agenceData } = await supabase
        .from('agences')
        .select('*')
        .eq('id', profileData.agence_id)
        .single()
      setAgence(agenceData ?? null)
    } else {
      setAgence(null)
    }
  }

  useEffect(() => {
    let actif = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!actif) return
      setSession(session)
      if (session) {
        await chargerProfil(session.user.id)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)

      if (!session) {
        setProfile(null)
        setAgence(null)
        profilCharge.current = null
        setLoading(false)
        return
      }

      // Le profil de cet utilisateur est déjà chargé : l'événement est un
      // simple rafraîchissement de jeton (retour sur l'onglet, par exemple).
      // Ne rien remonter — repasser `loading` à vrai démonterait toute
      // l'interface et ferait perdre une saisie en cours.
      if (profilCharge.current === session.user.id) return

      // Utilisateur réellement différent (connexion) : `loading` reste vrai
      // pendant le chargement du profil, sinon les routes protégées voient un
      // instant « session valide + profil absent » et bouclent en redirection.
      setLoading(true)

      // Le chargement est différé hors du callback : interroger Supabase
      // directement à l'intérieur bloque, car le callback détient un verrou
      // du client auth dont la requête a elle-même besoin pour son jeton.
      setTimeout(async () => {
        if (!actif) return
        await chargerProfil(session.user.id)
        setLoading(false)
      }, 0)
    })

    return () => {
      actif = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? traduireErreurConnexion(error.message) : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, agence, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider')
  return ctx
}
