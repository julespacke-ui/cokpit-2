import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Agence } from '../../types/database'
import { AgenceEtEquipe } from './AgenceEtEquipe'

export function AgenceDetailAdmin() {
  const { agenceId } = useParams<{ agenceId: string }>()
  const [agence, setAgence] = useState<Agence | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    if (!agenceId) return
    setChargement(true)
    supabase
      .from('agences')
      .select('*')
      .eq('id', agenceId)
      .maybeSingle()
      .then(({ data }) => {
        setAgence(data)
        setChargement(false)
      })
  }, [agenceId])

  if (!agenceId) return null

  return (
    <div className="p-4 md:p-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-text-dim hover:text-text">
        <ArrowLeft size={16} />
        Retour au benchmark
      </Link>

      <h2 className="mb-1 font-heading text-2xl">{chargement ? 'Chargement…' : agence?.nom}</h2>
      <p className="mb-6 text-text-dim">Vue admin — identique à ce que voit la personne sélectionnée</p>

      {!chargement && agence && <AgenceEtEquipe agenceId={agence.id} />}
    </div>
  )
}
