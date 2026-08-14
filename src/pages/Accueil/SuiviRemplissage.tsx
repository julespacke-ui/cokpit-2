import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { calculerStatutSemaine } from '../../lib/calculs'
import { listeSemaines, toISODate } from '../../lib/periodes'
import type { Profile } from '../../types/database'
import { Skeleton } from '../../components/ui/Skeleton'

type StatutGlobal = 'a_jour' | 'en_attente' | 'retard'

interface LigneSuivi {
  profil: Profile
  statut: StatutGlobal
}

/**
 * Statut global d'un commercial = le pire statut parmi ses semaines depuis sa
 * création de compte. "En attente" (semaine en cours, pas encore dans le
 * délai de retard) est distingué de "À jour" (tout est effectivement rempli)
 * pour ne pas laisser croire à une saisie faite alors qu'elle ne l'est pas.
 */
function statutGlobal(dateCreation: string, semainesRemplies: Set<string>): StatutGlobal {
  const aujourdHui = new Date()
  const statuts = listeSemaines(new Date(dateCreation), aujourdHui).map((lundi) =>
    calculerStatutSemaine(lundi, aujourdHui, semainesRemplies.has(toISODate(lundi))),
  )
  if (statuts.includes('retard')) return 'retard'
  if (statuts.includes('neutre')) return 'en_attente'
  return 'a_jour'
}

const BADGES: Record<StatutGlobal, { label: string; classes: string }> = {
  retard: { label: 'En retard', classes: 'bg-accent-3/15 text-accent-3' },
  en_attente: { label: 'En attente', classes: 'bg-text-faint/15 text-text-dim' },
  a_jour: { label: 'À jour', classes: 'bg-accent-2/15 text-accent-2' },
}

const ORDRE_STATUT: Record<StatutGlobal, number> = { retard: 0, en_attente: 1, a_jour: 2 }

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
            return { profil, statut: statutGlobal(profil.created_at, semainesRemplies) }
          }),
        )
        resultats.sort((a, b) => ORDRE_STATUT[a.statut] - ORDRE_STATUT[b.statut])
        setLignes(resultats)
        setChargement(false)
      })
  }, [agenceId])

  if (chargement) return <Skeleton lignes={3} className="max-w-md" />
  if (lignes.length === 0) return <p className="text-text-dim">Aucun commercial actif.</p>

  return (
    <div className="flex max-w-md flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-bg-elev p-4">
      {lignes.map(({ profil, statut }) => (
        <div
          key={profil.id}
          className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0"
        >
          <span className="text-sm">
            {profil.prenom} {profil.nom}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${BADGES[statut].classes}`}>
            {BADGES[statut].label}
          </span>
        </div>
      ))}
    </div>
  )
}
