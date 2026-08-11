import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SkeletonTableau } from '../../components/ui/Skeleton'

interface LigneClassement {
  id: string
  nom: string
  ventes: number
  honoraires: number
  mandats: number
}

interface ClassementAgenceProps {
  agenceId: string
  du: string
  au: string
  utilisateurActuelId?: string
}

export function ClassementAgence({ agenceId, du, au, utilisateurActuelId }: ClassementAgenceProps) {
  const [lignes, setLignes] = useState<LigneClassement[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)

    Promise.all([
      supabase
        .from('profiles')
        .select('id, prenom, nom')
        .eq('agence_id', agenceId)
        .in('role', ['gerant', 'commercial'])
        .eq('actif', true),
      supabase
        .from('ventes')
        .select('commercial_id, honoraires_reels, vente_services(prix)')
        .eq('agence_id', agenceId)
        .gte('date_vente', du)
        .lte('date_vente', au),
      supabase
        .from('saisies_hebdo')
        .select('commercial_id, mandats_rentres')
        .eq('agence_id', agenceId)
        .gte('semaine', du)
        .lte('semaine', au),
    ]).then(([profilsRes, ventesRes, saisiesRes]) => {
      const profils = profilsRes.data ?? []
      const ventes = ventesRes.data ?? []
      const saisies = saisiesRes.data ?? []

      const parPersonne = new Map<string, LigneClassement>()
      for (const p of profils) {
        parPersonne.set(p.id, { id: p.id, nom: `${p.prenom} ${p.nom}`, ventes: 0, honoraires: 0, mandats: 0 })
      }
      for (const v of ventes) {
        const ligne = parPersonne.get(v.commercial_id)
        if (ligne) {
          const totalServices = (v.vente_services ?? []).reduce((somme, s) => somme + s.prix, 0)
          ligne.ventes += 1
          ligne.honoraires += v.honoraires_reels + totalServices
        }
      }
      for (const s of saisies) {
        const ligne = parPersonne.get(s.commercial_id)
        if (ligne) ligne.mandats += s.mandats_rentres
      }

      setLignes([...parPersonne.values()].sort((a, b) => b.ventes - a.ventes))
      setChargement(false)
    })
  }, [agenceId, du, au])

  if (chargement) return <SkeletonTableau />

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-bg-elev">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-text-dim">
            <th className="px-4 py-3 font-normal">#</th>
            <th className="px-4 py-3 font-normal">Commercial</th>
            <th className="px-4 py-3 text-right font-normal">Ventes</th>
            <th className="px-4 py-3 text-right font-normal">Honoraires + services</th>
            <th className="px-4 py-3 text-right font-normal">Mandats</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, i) => (
            <tr
              key={ligne.id}
              className={`border-b border-line last:border-0 ${ligne.id === utilisateurActuelId ? 'bg-accent-1/10' : ''}`}
            >
              <td className="px-4 py-3 text-text-dim">{i + 1}</td>
              <td className="px-4 py-3">{ligne.nom}</td>
              <td className="px-4 py-3 text-right tabular-nums">{ligne.ventes}</td>
              <td className="px-4 py-3 text-right tabular-nums">{ligne.honoraires.toLocaleString('fr-FR')} €</td>
              <td className="px-4 py-3 text-right tabular-nums">{ligne.mandats}</td>
            </tr>
          ))}
          {lignes.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-3 text-text-dim">
                Aucune donnée sur cette période.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
