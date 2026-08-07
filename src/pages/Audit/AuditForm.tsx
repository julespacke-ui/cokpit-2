import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { QUESTIONNAIRE_AUDIT } from '../../lib/questionnaireAudit'
import type { Agence, Audit } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const COULEURS_BLOC = {
  violet: 'border-l-accent-1 text-accent-1',
  cyan: 'border-l-accent-5 text-accent-5',
  orange: 'border-l-accent-4 text-accent-4',
  vert: 'border-l-accent-2 text-accent-2',
  rouge: 'border-l-accent-3 text-accent-3',
  jaune: 'border-l-accent-6 text-accent-6',
} as const

interface AuditFormProps {
  audit: Audit | null
  agences: Agence[]
  onEnregistre: () => void
  onAnnuler: () => void
}

function aujourdHui(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AuditForm({ audit, agences, onEnregistre, onAnnuler }: AuditFormProps) {
  const [nomProspect, setNomProspect] = useState(audit?.nom_prospect ?? '')
  const [agenceId, setAgenceId] = useState(audit?.agence_id ?? '')
  const [date, setDate] = useState(audit?.date ?? aujourdHui())
  const [reponses, setReponses] = useState<Record<string, string | number>>(audit?.reponses ?? {})
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  function modifier(cle: string, valeur: string | number) {
    setReponses((r) => ({ ...r, [cle]: valeur }))
  }

  async function enregistrer() {
    setErreur(null)

    if (!nomProspect && !agenceId) {
      setErreur('Renseigne au moins un nom de prospect ou une agence.')
      return
    }

    setEnregistrement(true)
    const donnees = {
      nom_prospect: nomProspect || null,
      agence_id: agenceId || null,
      date,
      reponses,
    }

    const { error } = audit
      ? await supabase.from('audits').update(donnees).eq('id', audit.id)
      : await supabase.from('audits').insert(donnees)

    setEnregistrement(false)
    if (error) {
      setErreur(error.message)
      return
    }
    onEnregistre()
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="rounded-[var(--radius-card)] border border-line bg-bg-elev p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Prospect / société</label>
            <Input
              value={nomProspect}
              onChange={(e) => setNomProspect(e.target.value)}
              placeholder="Twiice Auto Bourg — Stéphane"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Agence cliente (si signé)</label>
            <select
              value={agenceId}
              onChange={(e) => setAgenceId(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-text"
            >
              <option value="">Aucune — prospect</option>
              {agences.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-dim">Date de l'audit</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {QUESTIONNAIRE_AUDIT.map((bloc) => (
        <div
          key={bloc.titre}
          className={`rounded-[var(--radius-card)] border border-line border-l-4 bg-bg-elev p-5 ${COULEURS_BLOC[bloc.couleur].split(' ')[0]}`}
        >
          <h3 className={`mb-4 font-heading text-base ${COULEURS_BLOC[bloc.couleur].split(' ')[1]}`}>
            {bloc.titre}
          </h3>
          <div className={bloc.champs.some((c) => c.type === 'texte_long') ? 'flex flex-col gap-4' : 'grid gap-4 sm:grid-cols-2'}>
            {bloc.champs.map((champ) => (
              <div key={champ.cle}>
                <label className="mb-1.5 block text-sm text-text-dim">
                  {champ.label}
                  {champ.suffixe && <span className="ml-1 text-text-faint">({champ.suffixe})</span>}
                </label>
                {champ.type === 'texte_long' ? (
                  <textarea
                    rows={2}
                    value={(reponses[champ.cle] as string) ?? ''}
                    onChange={(e) => modifier(champ.cle, e.target.value)}
                    className="w-full resize-y rounded-lg border border-line bg-bg-elev-2 px-4 py-3 text-base text-text outline-none focus:border-accent-1"
                  />
                ) : (
                  <Input
                    type={champ.type === 'nombre' ? 'number' : 'text'}
                    inputMode={champ.type === 'nombre' ? 'numeric' : undefined}
                    value={(reponses[champ.cle] as string | number) ?? ''}
                    onChange={(e) =>
                      modifier(champ.cle, champ.type === 'nombre' && e.target.value !== '' ? Number(e.target.value) : e.target.value)
                    }
                    className="w-full"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {erreur && <p className="rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">{erreur}</p>}

      <div className="flex gap-3 pb-4">
        <Button onClick={enregistrer} disabled={enregistrement}>
          {enregistrement ? 'Enregistrement…' : audit ? "Enregistrer les modifications" : "Créer l'audit"}
        </Button>
        <Button variant="secondary" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
