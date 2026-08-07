// ============================================================================
// COCKPIT — Périodes d'analyse (semaine / mois / trimestre / personnalisée)
// Utilitaires de dates pour les vues KPI. Séparé de calculs.ts qui contient
// les formules métier, pas la mécanique de calendrier.
// ============================================================================

export type Granularite = 'semaine' | 'mois' | 'trimestre'

export interface Periode {
  debut: Date
  fin: Date
}

export function lundiDeLaSemaine(date: Date): Date {
  const d = new Date(date)
  const jour = d.getDay() // 0 = dimanche ... 6 = samedi
  const decalage = jour === 0 ? -6 : 1 - jour
  d.setDate(d.getDate() + decalage)
  d.setHours(0, 0, 0, 0)
  return d
}

export function calculerPeriode(granularite: Granularite, reference: Date): Periode {
  if (granularite === 'semaine') {
    const debut = lundiDeLaSemaine(reference)
    const fin = new Date(debut)
    fin.setDate(fin.getDate() + 6)
    return { debut, fin }
  }
  if (granularite === 'mois') {
    const debut = new Date(reference.getFullYear(), reference.getMonth(), 1)
    const fin = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
    return { debut, fin }
  }
  // trimestre
  const trimestre = Math.floor(reference.getMonth() / 3)
  const debut = new Date(reference.getFullYear(), trimestre * 3, 1)
  const fin = new Date(reference.getFullYear(), trimestre * 3 + 3, 0)
  return { debut, fin }
}

/** Liste des lundis entre deux dates (bornes incluses), utilisée pour le suivi de remplissage. */
export function listeSemaines(debut: Date, fin: Date): Date[] {
  const semaines: Date[] = []
  const dernierLundi = lundiDeLaSemaine(fin)
  let curseur = lundiDeLaSemaine(debut)
  while (curseur <= dernierLundi) {
    semaines.push(new Date(curseur))
    curseur = new Date(curseur)
    curseur.setDate(curseur.getDate() + 7)
  }
  return semaines
}

export function decalerReference(granularite: Granularite, reference: Date, direction: 1 | -1): Date {
  const d = new Date(reference)
  if (granularite === 'semaine') d.setDate(d.getDate() + 7 * direction)
  else if (granularite === 'mois') d.setMonth(d.getMonth() + direction)
  else d.setMonth(d.getMonth() + 3 * direction)
  return d
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const FORMAT_MOIS = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

export function formatPeriode(granularite: Granularite, periode: Periode): string {
  if (granularite === 'semaine') return `Semaine du ${FORMAT_JOUR.format(periode.debut)}`
  if (granularite === 'mois') return capitaliser(FORMAT_MOIS.format(periode.debut))
  const trimestre = Math.floor(periode.debut.getMonth() / 3) + 1
  return `T${trimestre} ${periode.debut.getFullYear()}`
}

function capitaliser(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}
