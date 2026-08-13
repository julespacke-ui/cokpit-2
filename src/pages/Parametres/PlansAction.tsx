import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { PlanAction, Profile } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'

interface LigneCommercial {
  profil: Profile
  plan: PlanAction | null
}

export function PlansAction({ agenceId }: { agenceId: string }) {
  const [lignes, setLignes] = useState<LigneCommercial[]>([])
  const [chargement, setChargement] = useState(true)
  const [envoiEnCoursId, setEnvoiEnCoursId] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  function charger() {
    setChargement(true)
    Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('agence_id', agenceId)
        .in('role', ['commercial', 'gerant'])
        .eq('actif', true)
        .order('role')
        .order('prenom'),
      supabase.from('plans_action').select('*').eq('agence_id', agenceId),
    ]).then(([profilsRes, plansRes]) => {
      const profils = profilsRes.data ?? []
      const plans = (plansRes.data ?? []) as PlanAction[]
      setLignes(
        profils.map((p) => ({
          profil: p,
          plan: plans.find((pl) => pl.commercial_id === p.id) ?? null,
        })),
      )
      setChargement(false)
    })
  }

  useEffect(charger, [agenceId])

  async function handleFichier(commercial: Profile, fichier: File) {
    setErreur(null)
    setEnvoiEnCoursId(commercial.id)

    const chemin = `${commercial.id}/plan.html`
    // Supabase sert de toute façon les fichiers en text/plain sur les URLs
    // signées (protection anti-XSS plateforme) : peu importe le Content-Type
    // à l'upload, l'affichage (PlanActionCommercial/PlanActionListe) récupère
    // le texte et l'injecte lui-même via srcDoc.
    const { error: erreurUpload } = await supabase.storage
      .from('plans-action')
      .upload(chemin, fichier, { upsert: true })

    if (erreurUpload) {
      setEnvoiEnCoursId(null)
      setErreur(erreurUpload.message)
      return
    }

    const { error: erreurTable } = await supabase.from('plans_action').upsert(
      {
        commercial_id: commercial.id,
        agence_id: agenceId,
        titre: `Plan d'action — ${commercial.prenom} ${commercial.nom}`,
        storage_path: chemin,
        date_upload: new Date().toISOString(),
      },
      { onConflict: 'commercial_id' },
    )

    setEnvoiEnCoursId(null)
    if (erreurTable) {
      setErreur(erreurTable.message)
      return
    }
    charger()
  }

  async function handleSuppression(plan: PlanAction) {
    setErreur(null)
    setEnvoiEnCoursId(plan.commercial_id)

    const { error: erreurStorage } = await supabase.storage.from('plans-action').remove([plan.storage_path])
    if (erreurStorage) {
      setEnvoiEnCoursId(null)
      setErreur(erreurStorage.message)
      return
    }

    const { error: erreurTable } = await supabase.from('plans_action').delete().eq('id', plan.id)
    setEnvoiEnCoursId(null)
    if (erreurTable) {
      setErreur(erreurTable.message)
      return
    }
    charger()
  }

  if (chargement) return <Skeleton lignes={4} className="max-w-2xl" />

  return (
    <Card className="max-w-2xl">
      <div className="flex flex-col gap-3">
        {lignes.map(({ profil, plan }) => (
          <div key={profil.id} className="flex flex-wrap items-center gap-3 border-b border-line pb-3 last:border-0">
            <span className="min-w-40 flex-1">
              {profil.prenom} {profil.nom}
              {profil.role === 'gerant' && <span className="ml-2 text-xs text-text-faint">Gérant</span>}
              <span className="ml-2 text-xs text-text-faint">
                {plan ? `Envoyé le ${new Date(plan.date_upload).toLocaleDateString('fr-FR')}` : 'Aucun fichier'}
              </span>
            </span>
            <label
              className={`cursor-pointer rounded-lg border border-line bg-bg-elev-2 px-4 py-2.5 text-sm font-medium text-text transition-colors duration-150 hover:bg-line ${
                envoiEnCoursId === profil.id ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {envoiEnCoursId === profil.id ? 'Envoi…' : plan ? 'Remplacer le fichier' : '+ Ajouter un fichier'}
              <input
                type="file"
                accept=".html,text/html"
                className="hidden"
                onChange={(e) => {
                  const fichier = e.target.files?.[0]
                  if (fichier) handleFichier(profil, fichier)
                  e.target.value = ''
                }}
              />
            </label>
            {plan && (
              <Button
                type="button"
                variant="danger"
                disabled={envoiEnCoursId === profil.id}
                onClick={() => handleSuppression(plan)}
              >
                Retirer
              </Button>
            )}
          </div>
        ))}
        {lignes.length === 0 && <p className="text-text-dim">Aucun membre d'équipe actif dans cette agence.</p>}
      </div>

      {erreur && <p className="mt-4 rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">{erreur}</p>}
    </Card>
  )
}
