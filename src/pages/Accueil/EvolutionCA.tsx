import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { calculerPanierVente } from '../../lib/calculs'
import { couleurSerie } from '../../lib/couleurs'
import type { Agence } from '../../types/database'
import { SkeletonCarte } from '../../components/ui/Skeleton'

interface VenteAvecRelations {
  agence_id: string
  date_vente: string
  honoraires_reels: number
  pack_mer_prix_applique: number | null
  extensions_garantie: { prix_client: number } | null
  vente_services: { prix: number }[]
}

interface MoisAxe {
  cle: string // "YYYY-MM"
  label: string
}

interface Serie {
  agence: Agence
  couleur: string
  valeurs: number[] // une valeur par mois de `MOIS_FENETRE`
}

const NB_MOIS = 12
const FORMAT_MOIS_COURT = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })

function derniersMois(nb: number): MoisAxe[] {
  const mois: MoisAxe[] = []
  const reference = new Date()
  reference.setDate(1)
  for (let i = nb - 1; i >= 0; i--) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1)
    const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    mois.push({ cle, label: FORMAT_MOIS_COURT.format(d).replace('.', '') })
  }
  return mois
}

/** Sélecteur multi-agences par nom (checkboxes dans un panneau), plutôt qu'un simple compte "top N". */
function SelecteurAgencesMulti({
  agences,
  selectionnees,
  onChange,
}: {
  agences: Agence[]
  selectionnees: Set<string>
  onChange: (s: Set<string>) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', surClicExterieur)
    return () => document.removeEventListener('mousedown', surClicExterieur)
  }, [])

  const toutesSelectionnees = selectionnees.size === agences.length

  function toggleAgence(id: string) {
    const next = new Set(selectionnees)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  const label = toutesSelectionnees
    ? `Toutes (${agences.length})`
    : selectionnees.size === 0
      ? 'Aucune agence'
      : `${selectionnees.size} agence${selectionnees.size > 1 ? 's' : ''}`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="rounded-lg border border-line bg-bg-elev-2 px-3 py-2 text-sm text-text"
      >
        {label}
      </button>
      {ouvert && (
        <div className="absolute z-10 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-line bg-bg-elev-2 p-2 shadow-lg">
          <label className="mb-1 flex cursor-pointer items-center gap-2 rounded-md border-b border-line px-2 py-1.5 pb-2 text-sm hover:bg-bg-elev">
            <input
              type="checkbox"
              checked={toutesSelectionnees}
              onChange={() => onChange(toutesSelectionnees ? new Set() : new Set(agences.map((a) => a.id)))}
            />
            Toutes
          </label>
          {agences.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-bg-elev"
            >
              <input type="checkbox" checked={selectionnees.has(a.id)} onChange={() => toggleAgence(a.id)} />
              {a.nom}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const LARGEUR = 640
const HAUTEUR = 260
const MARGE_GAUCHE = 56
const MARGE_DROITE = 12
const MARGE_HAUT = 16
const MARGE_BAS = 30
const LARGEUR_TRACE = LARGEUR - MARGE_GAUCHE - MARGE_DROITE
const HAUTEUR_TRACE = HAUTEUR - MARGE_HAUT - MARGE_BAS

/**
 * Courbe d'évolution du CA mensuel par agence — réservée à l'admin. Le
 * toggle ne change que le plancher de l'axe Y (vraie baseline vs zéro) :
 * les données tracées sont strictement identiques dans les deux modes.
 */
export function EvolutionCA() {
  const [series, setSeries] = useState<Serie[]>([])
  const [chargement, setChargement] = useState(true)
  const [axe, setAxe] = useState<'zero' | 'baseline'>('zero')
  const [tri, setTri] = useState<'nom' | 'ca'>('ca')
  const [agencesSelectionnees, setAgencesSelectionnees] = useState<Set<string>>(new Set())

  const mois = derniersMois(NB_MOIS)

  useEffect(() => {
    setChargement(true)
    const du = `${mois[0].cle}-01`
    const finMoisCourant = new Date()
    const au = `${finMoisCourant.getFullYear()}-${String(finMoisCourant.getMonth() + 1).padStart(2, '0')}-${new Date(finMoisCourant.getFullYear(), finMoisCourant.getMonth() + 1, 0).getDate()}`

    Promise.all([
      supabase.from('agences').select('*').eq('est_demo', false).order('nom'),
      supabase
        .from('ventes')
        .select('agence_id, date_vente, honoraires_reels, pack_mer_prix_applique, extensions_garantie(prix_client), vente_services(prix)')
        .gte('date_vente', du)
        .lte('date_vente', au),
    ]).then(([agencesRes, ventesRes]) => {
      const agences = agencesRes.data ?? []
      const ventes = (ventesRes.data ?? []) as unknown as VenteAvecRelations[]

      const totalParAgenceEtMois = new Map<string, Map<string, number>>()
      for (const v of ventes) {
        const cleMois = v.date_vente.slice(0, 7)
        const panier = calculerPanierVente({
          honorairesReels: v.honoraires_reels,
          prixPackMer: v.pack_mer_prix_applique ?? undefined,
          prixExtensionGarantie: v.extensions_garantie?.prix_client,
          services: v.vente_services ?? [],
        })
        if (!totalParAgenceEtMois.has(v.agence_id)) totalParAgenceEtMois.set(v.agence_id, new Map())
        const parMois = totalParAgenceEtMois.get(v.agence_id)!
        parMois.set(cleMois, (parMois.get(cleMois) ?? 0) + panier)
      }

      const seriesCalc: Serie[] = agences.map((agence, i) => ({
        agence,
        couleur: couleurSerie(i),
        valeurs: mois.map((m) => totalParAgenceEtMois.get(agence.id)?.get(m.cle) ?? 0),
      }))

      setSeries(seriesCalc)
      setAgencesSelectionnees(new Set(agences.map((a) => a.id)))
      setChargement(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (chargement) return <SkeletonCarte />
  if (series.length === 0) return null

  // Trie sur le total CA de la fenêtre affichée (12 derniers mois), pas sur
  // un seul mois — plus représentatif pour choisir "les N plus grosses".
  const seriesTriees = [...series].sort((a, b) => {
    if (tri === 'nom') return a.agence.nom.localeCompare(b.agence.nom)
    const totalA = a.valeurs.reduce((s, v) => s + v, 0)
    const totalB = b.valeurs.reduce((s, v) => s + v, 0)
    return totalB - totalA
  })
  const seriesAffichees = seriesTriees.filter((s) => agencesSelectionnees.has(s.agence.id))

  const baselinesConfigurees = seriesAffichees
    .map((s) => s.agence.ca_baseline)
    .filter((b): b is number => b !== null)
  const plancherBaseline = baselinesConfigurees.length > 0 ? Math.min(...baselinesConfigurees) : 0

  const yMin = axe === 'baseline' ? plancherBaseline : 0
  const dataMax = Math.max(0, ...seriesAffichees.flatMap((s) => s.valeurs))
  const yMax = Math.max(dataMax, plancherBaseline, 100) * 1.15

  function x(i: number): number {
    return MARGE_GAUCHE + (i / (mois.length - 1)) * LARGEUR_TRACE
  }
  function y(valeur: number): number {
    const t = yMax === yMin ? 0 : (valeur - yMin) / (yMax - yMin)
    return MARGE_HAUT + HAUTEUR_TRACE - t * HAUTEUR_TRACE
  }

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + t * (yMax - yMin))

  return (
    <div className="animate-pop-in rounded-[var(--radius-card)] border border-line bg-bg-elev p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg">Évolution du CA par agence</h3>
        <div className="flex gap-1 rounded-lg border border-line bg-bg-elev-2 p-1">
          <button
            type="button"
            onClick={() => setAxe('zero')}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors duration-150 ${
              axe === 'zero' ? 'bg-accent-4 text-bg' : 'text-text-dim'
            }`}
          >
            Depuis zéro
          </button>
          <button
            type="button"
            onClick={() => setAxe('baseline')}
            disabled={baselinesConfigurees.length === 0}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors duration-150 disabled:opacity-40 ${
              axe === 'baseline' ? 'bg-accent-4 text-bg' : 'text-text-dim'
            }`}
          >
            Depuis la baseline
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-text-dim">Trier par :</label>
        <select
          value={tri}
          onChange={(e) => setTri(e.target.value as 'nom' | 'ca')}
          className="rounded-lg border border-line bg-bg-elev-2 px-3 py-2 text-sm text-text"
        >
          <option value="ca">CA (décroissant)</option>
          <option value="nom">Nom (A→Z)</option>
        </select>

        <label className="ml-2 text-sm text-text-dim">Agences :</label>
        <SelecteurAgencesMulti
          agences={seriesTriees.map((s) => s.agence)}
          selectionnees={agencesSelectionnees}
          onChange={setAgencesSelectionnees}
        />
      </div>

      {seriesAffichees.length === 0 && (
        <p className="rounded-lg bg-bg-elev-2 px-4 py-3 text-sm text-text-dim">Sélectionne au moins une agence.</p>
      )}

      <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} className="w-full">
        {ticksY.map((valeur, i) => (
          <g key={i}>
            <line
              x1={MARGE_GAUCHE}
              x2={LARGEUR - MARGE_DROITE}
              y1={y(valeur)}
              y2={y(valeur)}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text x={MARGE_GAUCHE - 8} y={y(valeur) + 3} textAnchor="end" fontSize={9} fill="var(--text-faint)">
              {Math.round(valeur).toLocaleString('fr-FR')} €
            </text>
          </g>
        ))}

        {mois.map((m, i) => (
          <text
            key={m.cle}
            x={x(i)}
            y={HAUTEUR - 8}
            textAnchor="middle"
            fontSize={9}
            fill="var(--text-faint)"
          >
            {m.label}
          </text>
        ))}

        {seriesAffichees.map((serie) => (
          <g key={serie.agence.id}>
            <path
              d={serie.valeurs.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')}
              fill="none"
              stroke={serie.couleur}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {serie.valeurs.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={serie.couleur} />
            ))}
          </g>
        ))}
      </svg>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {seriesAffichees.map((serie) => (
          <span key={serie.agence.id} className="flex items-center gap-2 text-sm text-text-dim">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: serie.couleur }} />
            {serie.agence.nom}
          </span>
        ))}
      </div>

      {axe === 'baseline' && baselinesConfigurees.length < seriesAffichees.length && (
        <p className="mt-3 text-xs text-text-faint">
          Certaines agences n'ont pas de baseline définie (Paramètres → Objectifs) — l'axe part de la plus
          basse baseline connue.
        </p>
      )}
    </div>
  )
}
