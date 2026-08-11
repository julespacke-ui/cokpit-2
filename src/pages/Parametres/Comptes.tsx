import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile, Role } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'

const ROLE_LABELS: Record<Role, string> = { admin: 'Admin', gerant: 'Gérant', commercial: 'Commercial' }

interface ComptesProps {
  agenceId: string
  peutChoisirRole: boolean
}

function ReinitialiserMotDePasse({ profil, onFermer }: { profil: Profile; onFermer: () => void }) {
  const [motDePasse, setMotDePasse] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [reussi, setReussi] = useState(false)

  async function valider() {
    setErreur(null)
    setEnvoiEnCours(true)
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
      'reset-mot-de-passe',
      { body: { user_id: profil.id, password: motDePasse } },
    )
    setEnvoiEnCours(false)
    if (error || data?.error) {
      setErreur(data?.error ?? error?.message ?? 'Erreur lors de la réinitialisation.')
      return
    }
    setReussi(true)
  }

  if (reussi) {
    return (
      <p className="mt-2 text-sm text-accent-2">
        Nouveau mot de passe enregistré pour {profil.prenom}.{' '}
        <button type="button" onClick={onFermer} className="underline hover:text-text">
          Fermer
        </button>
      </p>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Input
        type="text"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        placeholder="Nouveau mot de passe (8 caractères min.)"
        minLength={8}
        className="w-64"
      />
      <Button onClick={valider} disabled={envoiEnCours || motDePasse.length < 8}>
        {envoiEnCours ? 'Enregistrement…' : 'Valider'}
      </Button>
      <Button variant="secondary" onClick={onFermer} disabled={envoiEnCours}>
        Annuler
      </Button>
      {erreur && <p className="w-full text-sm text-accent-3">{erreur}</p>}
    </div>
  )
}

export function Comptes({ agenceId, peutChoisirRole }: ComptesProps) {
  const [profils, setProfils] = useState<Profile[]>([])
  const [chargement, setChargement] = useState(true)
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [resetOuvertId, setResetOuvertId] = useState<string | null>(null)

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [role, setRole] = useState<'gerant' | 'commercial'>('commercial')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  function charger() {
    setChargement(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('agence_id', agenceId)
      .order('role')
      .then(({ data }) => {
        setProfils(data ?? [])
        setChargement(false)
      })
  }

  useEffect(charger, [agenceId])

  async function toggleActif(p: Profile) {
    await supabase.from('profiles').update({ actif: !p.actif }).eq('id', p.id)
    charger()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnvoiEnCours(true)

    const { data, error } = await supabase.functions.invoke<{ id?: string; error?: string }>('create-compte', {
      body: { email, password: motDePasse, prenom, nom, role, agence_id: agenceId },
    })

    setEnvoiEnCours(false)

    if (error || data?.error) {
      setErreur(data?.error ?? error?.message ?? 'Erreur lors de la création du compte.')
      return
    }

    setPrenom('')
    setNom('')
    setEmail('')
    setMotDePasse('')
    setRole('commercial')
    setFormulaireOuvert(false)
    charger()
  }

  if (chargement) return <Skeleton lignes={4} className="max-w-2xl" />

  return (
    <Card className="max-w-2xl">
      <div className="flex flex-col gap-3">
        {profils.map((p) => {
          const peutReinitialiser = p.role !== 'admin' && (peutChoisirRole || p.role === 'commercial')
          return (
            <div key={p.id} className="border-b border-line pb-3 last:border-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-40 flex-1">
                  {p.prenom} {p.nom}
                  <span className="ml-2 text-xs text-text-faint">{ROLE_LABELS[p.role]}</span>
                </span>
                {peutReinitialiser && (
                  <Button
                    variant="secondary"
                    onClick={() => setResetOuvertId(resetOuvertId === p.id ? null : p.id)}
                  >
                    Réinitialiser le mot de passe
                  </Button>
                )}
                {p.role !== 'admin' && (
                  <Toggle checked={p.actif} onChange={() => toggleActif(p)} label={`Actif : ${p.prenom}`} />
                )}
              </div>
              {resetOuvertId === p.id && (
                <ReinitialiserMotDePasse profil={p} onFermer={() => setResetOuvertId(null)} />
              )}
            </div>
          )
        })}
        {profils.length === 0 && <p className="text-text-dim">Aucun compte pour l'instant.</p>}
      </div>

      {!formulaireOuvert && (
        <Button onClick={() => setFormulaireOuvert(true)} className="mt-6">
          + Ajouter {peutChoisirRole ? 'un compte' : 'un commercial'}
        </Button>
      )}

      {formulaireOuvert && (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
          <div className="flex flex-wrap gap-3">
            <Input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Prénom"
              required
              className="flex-1"
            />
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" required className="flex-1" />
          </div>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <Input
            type="text"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="Mot de passe provisoire (8 caractères min.)"
            required
            minLength={8}
          />
          {peutChoisirRole && (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'gerant' | 'commercial')}
              className="rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
            >
              <option value="commercial">Commercial</option>
              <option value="gerant">Gérant</option>
            </select>
          )}
          {erreur && (
            <p className="rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">{erreur}</p>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={envoiEnCours}>
              {envoiEnCours ? 'Création…' : 'Créer le compte'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setFormulaireOuvert(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
