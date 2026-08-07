import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PeriodeSelector, type PlagePeriode } from './PeriodeSelector'
import { BenchmarkAgences } from './BenchmarkAgences'

export function AdminAccueil() {
  const { profile } = useAuth()
  const [plage, setPlage] = useState<PlagePeriode | null>(null)

  if (!profile) return null

  return (
    <div className="p-4 md:p-8">
      <h2 className="mb-1 font-heading text-2xl">Bonjour {profile.prenom}</h2>
      <p className="mb-6 text-text-dim">Toutes les agences</p>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg">Benchmark inter-agences</h3>
        <PeriodeSelector onChange={setPlage} />
      </div>

      {plage && <BenchmarkAgences du={plage.du} au={plage.au} />}
    </div>
  )
}
