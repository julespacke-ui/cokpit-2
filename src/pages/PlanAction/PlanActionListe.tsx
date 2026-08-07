import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { PlanAction, Profile } from '../../types/database'

interface LigneCommercial {
  profil: Profile
  plan: PlanAction | null
}

export function PlanActionListe({ agenceId }: { agenceId: string }) {
  const [lignes, setLignes] = useState<LigneCommercial[]>([])
  const [selectionId, setSelectionId] = useState<string>('')
  const [contenuHtml, setContenuHtml] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)
    setSelectionId('')
    setContenuHtml(null)

    Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('agence_id', agenceId)
        .eq('role', 'commercial')
        .eq('actif', true)
        .order('prenom'),
      supabase.from('plans_action').select('*').eq('agence_id', agenceId),
    ]).then(([profilsRes, plansRes]) => {
      const profils = profilsRes.data ?? []
      const plans = (plansRes.data ?? []) as PlanAction[]
      const lignesCalc = profils.map((p) => ({
        profil: p,
        plan: plans.find((pl) => pl.commercial_id === p.id) ?? null,
      }))
      setLignes(lignesCalc)
      const premierAvecPlan = lignesCalc.find((l) => l.plan)
      if (premierAvecPlan) setSelectionId(premierAvecPlan.profil.id)
      setChargement(false)
    })
  }, [agenceId])

  useEffect(() => {
    const ligne = lignes.find((l) => l.profil.id === selectionId)
    if (!ligne?.plan) {
      setContenuHtml(null)
      return
    }
    supabase.storage
      .from('plans-action')
      .createSignedUrl(ligne.plan.storage_path, 3600)
      .then(async ({ data }) => {
        if (!data?.signedUrl) {
          setContenuHtml(null)
          return
        }
        // cf. PlanActionCommercial : Supabase sert le fichier en text/plain,
        // on récupère le texte et on l'injecte via srcDoc nous-mêmes.
        const reponse = await fetch(data.signedUrl)
        setContenuHtml(await reponse.text())
      })
  }, [selectionId, lignes])

  if (chargement) return <p className="text-text-dim">Chargement…</p>

  if (lignes.length === 0) {
    return <p className="text-text-dim">Aucun commercial dans cette agence.</p>
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {lignes.map(({ profil, plan }) => (
          <button
            key={profil.id}
            type="button"
            onClick={() => plan && setSelectionId(profil.id)}
            disabled={!plan}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              selectionId === profil.id
                ? 'border-accent-4 bg-accent-4 text-bg'
                : plan
                  ? 'border-line bg-bg-elev-2 text-text-dim hover:text-text'
                  : 'cursor-not-allowed border-line bg-bg-elev-2 text-text-faint opacity-50'
            }`}
          >
            {profil.prenom} {profil.nom}
            {!plan && ' (aucun fichier)'}
          </button>
        ))}
      </div>

      {contenuHtml ? (
        <iframe
          srcDoc={contenuHtml}
          title="Plan d'action"
          className="h-[75vh] w-full rounded-[var(--radius-card)] border border-line"
        />
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line bg-bg-elev p-6 text-text-dim">
          Sélectionne un commercial avec un fichier disponible.
        </div>
      )}
    </>
  )
}
