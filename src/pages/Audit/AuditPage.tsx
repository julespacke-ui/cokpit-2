import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Agence, Audit } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { AuditForm } from './AuditForm'

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR')

export function AuditPage() {
  const [audits, setAudits] = useState<Audit[]>([])
  const [agences, setAgences] = useState<Agence[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  /** null = liste ; 'nouveau' = création ; sinon l'audit en cours d'édition. */
  const [vue, setVue] = useState<'liste' | 'nouveau' | Audit>('liste')

  function charger() {
    setChargement(true)
    setErreur(null)
    Promise.all([
      supabase.from('audits').select('*').order('date', { ascending: false }),
      supabase.from('agences').select('*').order('nom'),
    ]).then(([auditsRes, agencesRes]) => {
      if (auditsRes.error) setErreur(auditsRes.error.message)
      setAudits((auditsRes.data ?? []) as Audit[])
      setAgences(agencesRes.data ?? [])
      setChargement(false)
    })
  }

  useEffect(charger, [])

  function nomAffiche(audit: Audit): string {
    if (audit.nom_prospect) return audit.nom_prospect
    const agence = agences.find((a) => a.id === audit.agence_id)
    return agence?.nom ?? 'Sans nom'
  }

  async function supprimer(audit: Audit) {
    await supabase.from('audits').delete().eq('id', audit.id)
    charger()
  }

  if (vue !== 'liste') {
    return (
      <div className="p-4 md:p-8">
        <h2 className="mb-1 font-heading text-2xl">{vue === 'nouveau' ? 'Nouvel audit' : "Modifier l'audit"}</h2>
        <p className="mb-6 text-text-dim">Tes notes de call — visible uniquement par toi</p>
        <AuditForm
          audit={vue === 'nouveau' ? null : vue}
          agences={agences}
          onEnregistre={() => {
            setVue('liste')
            charger()
          }}
          onAnnuler={() => setVue('liste')}
        />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">Audit</h2>
          <p className="text-text-dim">Tes notes de call — visible uniquement par toi</p>
        </div>
        <Button onClick={() => setVue('nouveau')}>+ Nouvel audit</Button>
      </div>

      {erreur && (
        <p className="mb-4 max-w-2xl rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">
          Erreur de chargement : {erreur}
        </p>
      )}

      {chargement ? (
        <Skeleton lignes={4} className="max-w-2xl" />
      ) : audits.length === 0 ? (
        <Card className="max-w-2xl text-text-dim">
          Aucun audit pour l'instant. Clique sur « Nouvel audit » après un call de découverte.
        </Card>
      ) : (
        <div className="flex max-w-2xl flex-col gap-3">
          {audits.map((audit) => (
            <Card key={audit.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{nomAffiche(audit)}</p>
                <p className="text-sm text-text-dim">
                  {FORMAT_DATE.format(new Date(audit.date))}
                  {audit.agence_id ? ' — client' : ' — prospect'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setVue(audit)}>
                  Ouvrir
                </Button>
                <Button variant="danger" onClick={() => supprimer(audit)}>
                  Supprimer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
