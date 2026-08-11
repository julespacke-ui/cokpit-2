import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { calculerStatutSemaine } from '../../lib/calculs'
import { listeSemaines, toISODate } from '../../lib/periodes'
import type { Profile } from '../../types/database'
import { Skeleton } from '../../components/ui/Skeleton'

interface LigneSuivi {
  profil: Profile
  enRetard: boolean
}

function estEnRetard(dateCreation: string, semainesRemplies: Set<string>): boolean {
  const aujourdHui = new Date()
  const semaines = listeSemaines(new Date(dateCreation), aujourdHui)
  return semaines.some(
    (lundi) => calculerStatutSemaine(lundi, aujourdHui, semainesRemplies.has(toISODate(lundi))) === 'retard',
  )
}

export function SuiviRemplissage({ agenceId }: { agenceId: string }) {
  const [lignes, setLignes] = useState<LigneSuivi[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)
    // Seuls les commerciaux ont une obligation de remplissage hebdo : le
    // gérant peut saisir sa propre semaine, mais l'alerte ne le concerne
    // jamais, même s'il n'a rien rempli depuis longtemps.
    supabase
      .from('profiles')
      .select('*')
      .eq('agence_id', agenceId)
      .eq('role', 'commercial')
      .eq('actif', true)
      .order('prenom')
      .then(async ({ data: profils }) => {
        const liste = profils ?? []
        const resultats = await Promise.all(
          liste.map(async (profil) => {
            const { data } = await supabase.from('saisies_hebdo').select('semaine').eq('commercial_id', profil.id)
            const semainesRemplies = new Set((data ?? []).map((s) => s.semaine))
            return { profil, enRetard: estEnRetard(profil.created_at, semainesRemplies) }
          }),
        )
        resultats.sort((a, b) => Number(b.enRetard) - Number(a.enRetard))
        setLignes(resultats)
        setChargement(false)
      })
  }, [agenceId])

  if (chargement) return <Skeleton lignes={3} className="max-w-md" />
  if (lignes.length === 0) return <p className="text-text-dim">Aucun commercial actif.</p>

  return (
    <div className="flex max-w-md flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-bg-elev p-4">
      {lignes.map(({ profil, enRetard }) => (
        <div
          key={profil.id}
          className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0"
        >
          <span className="text-sm">
            {profil.prenom} {profil.nom}
          </span>
          {enRetard ? (
            <span className="rounded-full bg-accent-3/15 px-2.5 py-1 text-xs font-medium text-accent-3">
              En retard
            </span>
          ) : (
            <span className="rounded-full bg-accent-2/15 px-2.5 py-1 text-xs font-medium text-accent-2">
              À jour
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
