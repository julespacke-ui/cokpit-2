import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Objectif, Profile } from '../../types/database'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

interface Cibles {
  ventes?: number
  ca_honoraires?: number
  rdv_semaine?: number
  mandats?: number
  videos?: number
  avis?: number
  extensions_garantie?: number
  prospections?: number
}

const CHAMPS: { cle: keyof Cibles; label: string }[] = [
  { cle: 'ventes', label: 'Ventes' },
  { cle: 'ca_honoraires', label: 'CA honoraires (€)' },
  { cle: 'rdv_semaine', label: 'RDV / semaine' },
  { cle: 'mandats', label: 'Mandats' },
  { cle: 'videos', label: 'Vidéos' },
  { cle: 'avis', label: 'Avis' },
  { cle: 'extensions_garantie', label: 'Extensions garantie' },
  { cle: 'prospections', label: 'Prospections extérieures' },
]

function moisActuelISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function upsertObjectif(agenceId: string, commercialId: string | null, periode: string, cibles: Cibles) {
  let requete = supabase.from('objectifs').select('id').eq('agence_id', agenceId).eq('periode', periode)
  requete = commercialId ? requete.eq('commercial_id', commercialId) : requete.is('commercial_id', null)
  const { data: existant } = await requete.maybeSingle()

  if (existant) {
    return supabase.from('objectifs').update({ cibles }).eq('id', existant.id)
  }
  return supabase.from('objectifs').insert({ agence_id: agenceId, commercial_id: commercialId, periode, cibles })
}

function CiblesForm({ cibles, onChange }: { cibles: Cibles; onChange: (c: Cibles) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {CHAMPS.map(({ cle, label }) => (
        <div key={cle}>
          <label className="mb-1.5 block text-sm text-text-dim">{label}</label>
          <Input
            type="number"
            value={cibles[cle] ?? ''}
            onChange={(e) =>
              onChange({ ...cibles, [cle]: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
        </div>
      ))}
    </div>
  )
}

export function Objectifs({ agenceId }: { agenceId: string }) {
  const [mois, setMois] = useState(moisActuelISO())
  const [chargement, setChargement] = useState(true)
  const [ciblesAgence, setCiblesAgence] = useState<Cibles>({})
  const [membresEquipe, setMembresEquipe] = useState<Profile[]>([])
  const [ciblesParCommercial, setCiblesParCommercial] = useState<Record<string, Cibles>>({})
  const [commercialOuvert, setCommercialOuvert] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [enregistrement, setEnregistrement] = useState(false)

  const [baseline, setBaseline] = useState<number | ''>('')
  const [chargementBaseline, setChargementBaseline] = useState(true)
  const [enregistrementBaseline, setEnregistrementBaseline] = useState(false)
  const [messageBaseline, setMessageBaseline] = useState<string | null>(null)

  const periode = `${mois}-01`

  useEffect(() => {
    setChargement(true)
    setMessage(null)
    Promise.all([
      supabase.from('objectifs').select('*').eq('agence_id', agenceId).eq('periode', periode),
      supabase
        .from('profiles')
        .select('*')
        .eq('agence_id', agenceId)
        .in('role', ['commercial', 'gerant'])
        .eq('actif', true)
        .order('role')
        .order('prenom'),
    ]).then(([objectifsRes, membresRes]) => {
      const objectifs = (objectifsRes.data ?? []) as Objectif[]
      const objectifAgence = objectifs.find((o) => o.commercial_id === null)
      setCiblesAgence((objectifAgence?.cibles as Cibles) ?? {})

      const parCommercial: Record<string, Cibles> = {}
      for (const o of objectifs) {
        if (o.commercial_id) parCommercial[o.commercial_id] = o.cibles as Cibles
      }
      setCiblesParCommercial(parCommercial)
      setMembresEquipe(membresRes.data ?? [])
      setChargement(false)
    })
  }, [agenceId, periode])

  useEffect(() => {
    setChargementBaseline(true)
    setMessageBaseline(null)
    supabase
      .from('agences')
      .select('ca_baseline')
      .eq('id', agenceId)
      .single()
      .then(({ data }) => {
        setBaseline(data?.ca_baseline ?? '')
        setChargementBaseline(false)
      })
  }, [agenceId])

  async function enregistrerBaseline() {
    setEnregistrementBaseline(true)
    setMessageBaseline(null)
    const { error } = await supabase
      .from('agences')
      .update({ ca_baseline: baseline === '' ? null : baseline })
      .eq('id', agenceId)
    setEnregistrementBaseline(false)
    setMessageBaseline(error ? `Erreur : ${error.message}` : 'Baseline enregistrée.')
  }

  async function enregistrerAgence() {
    setEnregistrement(true)
    setMessage(null)
    const { error } = await upsertObjectif(agenceId, null, periode, ciblesAgence)
    setEnregistrement(false)
    setMessage(error ? `Erreur : ${error.message}` : 'Objectifs agence enregistrés.')
  }

  async function enregistrerCommercial(commercialId: string) {
    setEnregistrement(true)
    setMessage(null)
    const cibles = ciblesParCommercial[commercialId] ?? {}
    const { error } = await upsertObjectif(agenceId, commercialId, periode, cibles)
    setEnregistrement(false)
    setMessage(error ? `Erreur : ${error.message}` : 'Objectif enregistré.')
  }

  if (chargement || chargementBaseline) return <Skeleton lignes={4} className="max-w-2xl" />

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <h3 className="mb-1 font-heading text-lg">CA de départ (baseline)</h3>
        <p className="mb-4 text-sm text-text-dim">
          Saisie une fois au démarrage de l'accompagnement — sert de repère fixe, jamais recalculé
          automatiquement. Modifiable en cas d'erreur de saisie.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">CA de départ (€)</label>
            <Input
              type="number"
              value={baseline}
              onChange={(e) => setBaseline(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-48"
            />
          </div>
          <Button onClick={enregistrerBaseline} disabled={enregistrementBaseline}>
            {enregistrementBaseline ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
        {messageBaseline && <p className="mt-3 text-sm text-text-dim">{messageBaseline}</p>}
      </Card>

      <div>
        <label className="mb-1.5 block text-sm text-text-dim">Mois</label>
        <input
          type="month"
          value={mois}
          onChange={(e) => setMois(e.target.value)}
          className="rounded-lg border border-line bg-bg-elev-2 px-4 py-2.5 text-text"
        />
      </div>

      <Card>
        <h3 className="mb-4 font-heading text-lg">Objectifs agence</h3>
        <CiblesForm cibles={ciblesAgence} onChange={setCiblesAgence} />
        <Button onClick={enregistrerAgence} disabled={enregistrement} className="mt-4">
          Enregistrer
        </Button>
      </Card>

      <Card>
        <h3 className="mb-4 font-heading text-lg">Objectifs individuels (optionnel)</h3>
        <p className="mb-4 text-sm text-text-dim">
          Le responsable d'agence peut aussi avoir ses propres objectifs — ils apparaîtront sur sa vue
          commerciale, comme pour un commercial.
        </p>
        <div className="flex flex-col gap-3">
          {membresEquipe.map((c) => (
            <div key={c.id} className="border-b border-line pb-3 last:border-0">
              <button
                type="button"
                onClick={() => setCommercialOuvert(commercialOuvert === c.id ? null : c.id)}
                className="text-sm text-text hover:text-accent-4"
              >
                {c.prenom} {c.nom}
                {c.role === 'gerant' && <span className="ml-2 text-xs text-text-faint">Gérant</span>}
              </button>
              {commercialOuvert === c.id && (
                <div className="mt-3">
                  <CiblesForm
                    cibles={ciblesParCommercial[c.id] ?? {}}
                    onChange={(cibles) => setCiblesParCommercial((prev) => ({ ...prev, [c.id]: cibles }))}
                  />
                  <Button onClick={() => enregistrerCommercial(c.id)} disabled={enregistrement} className="mt-4">
                    Enregistrer
                  </Button>
                </div>
              )}
            </div>
          ))}
          {membresEquipe.length === 0 && <p className="text-text-dim">Aucun membre d'équipe actif.</p>}
        </div>
      </Card>

      {message && <p className="text-sm text-text-dim">{message}</p>}
    </div>
  )
}
