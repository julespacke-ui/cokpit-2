import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Agence } from '../../types/database'
import { PlanActionCommercial } from './PlanActionCommercial'
import { PlanActionListe } from './PlanActionListe'

export function PlanActionPage() {
  const { profile } = useAuth()
  const estAdmin = profile?.role === 'admin'

  const [agences, setAgences] = useState<Agence[]>([])
  const [agenceSelectionneeId, setAgenceSelectionneeId] = useState('')

  useEffect(() => {
    if (!estAdmin) return
    supabase
      .from('agences')
      .select('*')
      .order('nom')
      .then(({ data }) => {
        setAgences(data ?? [])
        setAgenceSelectionneeId((prev) => prev || data?.[0]?.id || '')
      })
  }, [estAdmin])

  if (!profile) return null

  return (
    <div className="p-4 md:p-8">
      <h2 className="mb-4 font-heading text-2xl">Plan d'action</h2>

      {profile.role === 'commercial' && <PlanActionCommercial />}

      {profile.role === 'gerant' && profile.agence_id && <PlanActionListe agenceId={profile.agence_id} />}

      {estAdmin && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-text-dim">Agence :</label>
            <select
              value={agenceSelectionneeId}
              onChange={(e) => setAgenceSelectionneeId(e.target.value)}
              className="rounded-lg border border-line bg-bg-elev-2 px-3 py-2 text-sm text-text"
            >
              {agences.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </div>
          {agenceSelectionneeId && <PlanActionListe agenceId={agenceSelectionneeId} />}
        </>
      )}
    </div>
  )
}
