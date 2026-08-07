import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { APP_NAME } from '../lib/config'

export function Connexion() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  if (session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnvoiEnCours(true)
    const { error } = await signIn(email, motDePasse)
    setEnvoiEnCours(false)
    if (error) setErreur(error)
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-bg-elev p-8">
        <h1 className="mb-1 font-heading text-2xl">{APP_NAME}</h1>
        <p className="mb-6 text-sm text-text-dim">Connecte-toi à ton espace</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-text-dim">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-base text-text outline-none focus:border-accent-1"
              placeholder="ton@email.fr"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="mot-de-passe" className="text-sm text-text-dim">
              Mot de passe
            </label>
            <input
              id="mot-de-passe"
              type="password"
              autoComplete="current-password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-base text-text outline-none focus:border-accent-1"
              placeholder="••••••••"
            />
          </div>

          {erreur && (
            <div className="rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">
              {erreur}
            </div>
          )}

          <button
            type="submit"
            disabled={envoiEnCours}
            className="mt-2 rounded-lg bg-accent-4 px-4 py-3 text-base font-medium text-bg disabled:opacity-60"
          >
            {envoiEnCours ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  )
}
