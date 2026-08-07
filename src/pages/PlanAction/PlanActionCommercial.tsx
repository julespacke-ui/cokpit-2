import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { PlanAction } from '../../types/database'

export function PlanActionCommercial() {
  const { profile } = useAuth()
  const [plan, setPlan] = useState<PlanAction | null>(null)
  const [contenuHtml, setContenuHtml] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    if (!profile) return
    setChargement(true)
    supabase
      .from('plans_action')
      .select('*')
      .eq('commercial_id', profile.id)
      .maybeSingle()
      .then(async ({ data }) => {
        setPlan(data)
        if (data) {
          const { data: signee } = await supabase.storage
            .from('plans-action')
            .createSignedUrl(data.storage_path, 3600)
          if (signee?.signedUrl) {
            // Supabase Storage sert les fichiers en text/plain sur les URLs
            // signées (protection anti-XSS côté plateforme) : on récupère le
            // contenu en texte et on l'injecte nous-mêmes via srcDoc plutôt
            // que de pointer l'iframe directement sur l'URL signée.
            const reponse = await fetch(signee.signedUrl)
            setContenuHtml(await reponse.text())
          }
        }
        setChargement(false)
      })
  }, [profile])

  if (chargement) return <p className="text-text-dim">Chargement…</p>

  if (!plan || !contenuHtml) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-bg-elev p-6 text-text-dim">
        Aucun plan d'action disponible pour l'instant.
      </div>
    )
  }

  return (
    <iframe
      srcDoc={contenuHtml}
      title={plan.titre}
      // sandbox sans "allow-same-origin" : le fichier s'exécute dans une
      // origine isolée et ne peut donc pas lire la session de l'utilisateur.
      // allow-scripts garde les plans d'action interactifs fonctionnels.
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      className="h-[75vh] w-full rounded-[var(--radius-card)] border border-line"
    />
  )
}
