import { useEffect, useState, type ReactNode } from 'react'
import { Users, Car, Video, Repeat, Package, Star, Link2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { SaisieHebdo } from '../types/database'
import { Button } from '../components/ui/Button'
import { ToggleVisuel } from '../components/ui/Toggle'
import { SkeletonCarte } from '../components/ui/Skeleton'
import { BarreProgression } from '../components/ui/BarreProgression'
import { Toast, useToast } from '../components/ui/Toast'

type ChampsSaisie = Pick<
  SaisieHebdo,
  | 'appels_passes'
  | 'leads_traites'
  | 'rdv_pris'
  | 'rdv_venus'
  | 'mandats_rentres'
  | 'leads_acheteurs'
  | 'propositions_commerciales'
  | 'visites'
  | 'videos_postees'
  | 'prospections_exterieures'
  | 'liste_chaude_levee'
  | 'sortie_prospection_faite'
  | 'videos_prevues_publiees'
  | 'stock_entrees'
  | 'stock_sorties'
  | 'stock_total'
  | 'nb_avis_recus'
>

const VALEURS_INITIALES: ChampsSaisie = {
  appels_passes: 0,
  leads_traites: 0,
  rdv_pris: 0,
  rdv_venus: 0,
  mandats_rentres: 0,
  leads_acheteurs: 0,
  propositions_commerciales: 0,
  visites: 0,
  videos_postees: 0,
  prospections_exterieures: 0,
  liste_chaude_levee: false,
  sortie_prospection_faite: false,
  videos_prevues_publiees: false,
  stock_entrees: 0,
  stock_sorties: 0,
  stock_total: 0,
  nb_avis_recus: 0,
}

const FENETRE_PROGRESSION = 12

function lundiDeLaSemaine(date: Date): Date {
  const d = new Date(date)
  const jour = d.getDay() // 0 = dimanche ... 6 = samedi
  const decalage = jour === 0 ? -6 : 1 - jour
  d.setDate(d.getDate() + decalage)
  d.setHours(0, 0, 0, 0)
  return d
}

function ajouterJours(d: Date, jours: number): Date {
  const copie = new Date(d)
  copie.setDate(copie.getDate() + jours)
  return copie
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Nombre de semaines remplies sur les `fenetre` dernières semaines glissantes (à partir d'aujourd'hui). */
function compterSemainesRempliesFenetre(semainesRemplies: Set<string>, fenetre: number): number {
  let compte = 0
  let curseur = lundiDeLaSemaine(new Date())
  for (let i = 0; i < fenetre; i++) {
    if (semainesRemplies.has(toISODate(curseur))) compte++
    curseur = ajouterJours(curseur, -7)
  }
  return compte
}

const FORMAT_SEMAINE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const COULEURS_BLOC = {
  violet: { bordure: 'border-l-accent-1', texte: 'text-accent-1' },
  cyan: { bordure: 'border-l-accent-5', texte: 'text-accent-5' },
  orange: { bordure: 'border-l-accent-4', texte: 'text-accent-4' },
  vert: { bordure: 'border-l-accent-2', texte: 'text-accent-2' },
  rouge: { bordure: 'border-l-accent-3', texte: 'text-accent-3' },
  jaune: { bordure: 'border-l-accent-6', texte: 'text-accent-6' },
} as const

type CouleurBloc = keyof typeof COULEURS_BLOC

function BlocCard({
  titre,
  icone: Icone,
  couleur,
  accessoire,
  children,
}: {
  titre: string
  icone: typeof Users
  couleur: CouleurBloc
  accessoire?: ReactNode
  children: ReactNode
}) {
  const classes = COULEURS_BLOC[couleur]
  return (
    <div className={`rounded-[var(--radius-card)] border border-line ${classes.bordure} border-l-4 bg-bg-elev p-5`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2 ${classes.texte}`}>
          <Icone size={18} />
          <h3 className="font-heading text-base">{titre}</h3>
        </div>
        {accessoire}
      </div>
      {children}
    </div>
  )
}

function ChampNombre({
  label,
  valeur,
  onChange,
  couleur,
}: {
  label: string
  valeur: number
  onChange: (v: number) => void
  couleur?: CouleurBloc
}) {
  return (
    // h-full + justify-between : le chiffre se cale en bas de la cellule, donc
    // les chiffres restent alignés entre eux même si un libellé passe sur deux
    // lignes (ex. « Sorties (livraisons) »).
    <div className="flex h-full flex-col justify-between">
      <p className="mb-1 text-xs text-text-dim">{label}</p>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={valeur}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className={`-mx-1 w-[calc(100%+0.5rem)] rounded-md bg-transparent px-1 font-heading text-2xl tabular-nums outline-none transition-colors focus:bg-bg-elev-2 ${
          couleur ? COULEURS_BLOC[couleur].texte : 'text-text'
        }`}
      />
    </div>
  )
}

/** Ligne de routine entièrement cliquable (texte compris), plus confortable au pouce. */
function LigneRoutine({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (valeur: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-bg-elev-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"
    >
      <span className={`text-sm transition-colors ${checked ? 'text-text' : 'text-text-dim'}`}>{label}</span>
      <ToggleVisuel checked={checked} />
    </button>
  )
}

/** Valeur calculée automatiquement (non saisissable), avec une icône indiquant la source liée. */
function StatAuto({ label, valeur, couleur }: { label: string; valeur: number; couleur?: CouleurBloc }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <p className="mb-1 flex items-center gap-1 text-xs text-text-dim">
        {label}
        <Link2 size={11} className="text-text-faint" />
      </p>
      <p className={`font-heading text-2xl tabular-nums ${couleur ? COULEURS_BLOC[couleur].texte : 'text-text'}`}>
        {valeur}
      </p>
    </div>
  )
}

export function MaSemaine() {
  const { profile } = useAuth()
  const [lundi, setLundi] = useState(() => lundiDeLaSemaine(new Date()))
  const [champs, setChamps] = useState<ChampsSaisie>(VALEURS_INITIALES)
  const [stockPrecedent, setStockPrecedent] = useState<number | null>(null)
  const [ventesSemaine, setVentesSemaine] = useState(0)
  const [semainesRemplies, setSemainesRemplies] = useState<Set<string>>(new Set())
  const [chargement, setChargement] = useState(true)
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const toast = useToast()

  const semaineISO = toISODate(lundi)
  const semainePrecedenteISO = toISODate(ajouterJours(lundi, -7))
  const finSemaineISO = toISODate(ajouterJours(lundi, 6))

  useEffect(() => {
    if (!profile) return
    setChargement(true)
    setErreur(null)

    Promise.all([
      supabase
        .from('saisies_hebdo')
        .select('*')
        .eq('commercial_id', profile.id)
        .eq('semaine', semaineISO)
        .maybeSingle(),
      supabase
        .from('saisies_hebdo')
        .select('stock_total')
        .eq('commercial_id', profile.id)
        .eq('semaine', semainePrecedenteISO)
        .maybeSingle(),
      supabase
        .from('ventes')
        .select('id', { count: 'exact', head: true })
        .eq('commercial_id', profile.id)
        .gte('date_vente', semaineISO)
        .lte('date_vente', finSemaineISO),
    ]).then(([actuelle, precedente, ventesRes]) => {
      const precedentTotal = precedente.data?.stock_total ?? null
      setStockPrecedent(precedentTotal)
      setVentesSemaine(ventesRes.count ?? 0)

      if (actuelle.data) {
        setChamps(actuelle.data)
      } else {
        setChamps({ ...VALEURS_INITIALES, stock_total: precedentTotal ?? 0 })
      }
      setChargement(false)
    })
  }, [profile, semaineISO, semainePrecedenteISO, finSemaineISO])

  function chargerSemainesRemplies() {
    if (!profile) return
    supabase
      .from('saisies_hebdo')
      .select('semaine')
      .eq('commercial_id', profile.id)
      .then(({ data }) => setSemainesRemplies(new Set((data ?? []).map((s) => s.semaine))))
  }

  useEffect(chargerSemainesRemplies, [profile])

  if (!profile) return null

  function modifier<K extends keyof ChampsSaisie>(champ: K, valeur: ChampsSaisie[K]) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  const totalAttendu =
    stockPrecedent !== null ? stockPrecedent + champs.stock_entrees - champs.stock_sorties : null
  const ecartDetecte = totalAttendu !== null && totalAttendu !== champs.stock_total
  const semainesRempliesFenetre = compterSemainesRempliesFenetre(semainesRemplies, FENETRE_PROGRESSION)

  async function enregistrer() {
    setEnregistrement(true)
    setErreur(null)
    const { error } = await supabase.from('saisies_hebdo').upsert(
      {
        commercial_id: profile!.id,
        agence_id: profile!.agence_id,
        semaine: semaineISO,
        ...champs,
      },
      { onConflict: 'commercial_id,semaine' },
    )
    setEnregistrement(false)
    if (error) {
      setErreur(error.message)
      return
    }
    toast.montrer('Semaine enregistrée')
    chargerSemainesRemplies()
  }

  return (
    <div className="p-4 pb-24 md:p-8">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl">Ma semaine</h2>
          <p className="text-sm text-text-dim">Semaine du {FORMAT_SEMAINE.format(lundi)}</p>
        </div>
        <div className="w-full max-w-56">
          <p
            title={`Sur les ${FENETRE_PROGRESSION} dernières semaines`}
            className="mb-1.5 text-right text-[11px] uppercase tracking-wide text-text-faint"
          >
            {semainesRempliesFenetre}/{FENETRE_PROGRESSION} semaines remplies
          </p>
          <BarreProgression
            pourcentage={(semainesRempliesFenetre / FENETRE_PROGRESSION) * 100}
            couleur="linear-gradient(90deg, var(--accent-4), var(--accent-1))"
          />
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setLundi((l) => ajouterJours(l, -7))}
          className="shrink-0 rounded-lg border border-line bg-bg-elev-2 px-4 py-2.5 text-sm text-text-dim hover:text-text"
        >
          ← Précédente
        </button>
        <button
          type="button"
          onClick={() => setLundi((l) => ajouterJours(l, 7))}
          className="shrink-0 rounded-lg border border-line bg-bg-elev-2 px-4 py-2.5 text-sm text-text-dim hover:text-text"
        >
          Suivante →
        </button>
      </div>

      {chargement ? (
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCarte key={i} />
          ))}
        </div>
      ) : (
        <div className="flex max-w-2xl flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <BlocCard titre="Funnel vendeurs" icone={Users} couleur="violet">
              <div className="grid grid-cols-2 gap-4">
                <ChampNombre
                  label="Appels"
                  valeur={champs.appels_passes}
                  onChange={(v) => modifier('appels_passes', v)}
                />
                <ChampNombre
                  label="Leads traités"
                  valeur={champs.leads_traites}
                  onChange={(v) => modifier('leads_traites', v)}
                />
                <ChampNombre label="RDV pris" valeur={champs.rdv_pris} onChange={(v) => modifier('rdv_pris', v)} />
                <ChampNombre
                  label="RDV venus"
                  valeur={champs.rdv_venus}
                  onChange={(v) => modifier('rdv_venus', v)}
                  couleur="cyan"
                />
                <ChampNombre
                  label="Mandats"
                  valeur={champs.mandats_rentres}
                  onChange={(v) => modifier('mandats_rentres', v)}
                  couleur="vert"
                />
              </div>
            </BlocCard>

            <BlocCard titre="Funnel acheteurs" icone={Car} couleur="cyan">
              <div className="grid grid-cols-2 gap-4">
                <ChampNombre
                  label="Leads"
                  valeur={champs.leads_acheteurs}
                  onChange={(v) => modifier('leads_acheteurs', v)}
                />
                <ChampNombre
                  label="Propositions"
                  valeur={champs.propositions_commerciales}
                  onChange={(v) => modifier('propositions_commerciales', v)}
                />
                <ChampNombre
                  label="Visites"
                  valeur={champs.visites}
                  onChange={(v) => modifier('visites', v)}
                  couleur="cyan"
                />
                <StatAuto label="Ventes" valeur={ventesSemaine} couleur="vert" />
              </div>
            </BlocCard>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BlocCard titre="Activité" icone={Video} couleur="orange">
              <div className="grid grid-cols-2 gap-4">
                <ChampNombre
                  label="Vidéos postées"
                  valeur={champs.videos_postees}
                  onChange={(v) => modifier('videos_postees', v)}
                />
                <ChampNombre
                  label="Prospections"
                  valeur={champs.prospections_exterieures}
                  onChange={(v) => modifier('prospections_exterieures', v)}
                />
              </div>
            </BlocCard>

            <BlocCard titre="Routines" icone={Repeat} couleur="vert">
              <div className="flex flex-col gap-1.5">
                <LigneRoutine
                  label="Liste chaude levée"
                  checked={champs.liste_chaude_levee}
                  onChange={(v) => modifier('liste_chaude_levee', v)}
                />
                <LigneRoutine
                  label="Sortie prospection"
                  checked={champs.sortie_prospection_faite}
                  onChange={(v) => modifier('sortie_prospection_faite', v)}
                />
                <LigneRoutine
                  label="Vidéos publiées"
                  checked={champs.videos_prevues_publiees}
                  onChange={(v) => modifier('videos_prevues_publiees', v)}
                />
              </div>
            </BlocCard>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BlocCard
              titre="Stock"
              icone={Package}
              couleur="rouge"
              accessoire={
                stockPrecedent !== null && (
                  <span className="rounded-full bg-accent-5/15 px-2.5 py-1 text-xs font-medium text-accent-5">
                    S-1 : {stockPrecedent}
                  </span>
                )
              }
            >
              <div className="grid grid-cols-3 gap-4">
                <ChampNombre
                  label="Entrées"
                  valeur={champs.stock_entrees}
                  onChange={(v) => modifier('stock_entrees', v)}
                  couleur="vert"
                />
                <ChampNombre
                  label="Sorties (livraisons)"
                  valeur={champs.stock_sorties}
                  onChange={(v) => modifier('stock_sorties', v)}
                  couleur="rouge"
                />
                <ChampNombre
                  label="Total déclaré"
                  valeur={champs.stock_total}
                  onChange={(v) => modifier('stock_total', v)}
                />
              </div>
              {ecartDetecte && (
                <p className="mt-4 rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">
                  Écart détecté avec la semaine précédente : vérifie ta saisie ({stockPrecedent} +{' '}
                  {champs.stock_entrees} − {champs.stock_sorties} = {totalAttendu}, pas {champs.stock_total})
                </p>
              )}
            </BlocCard>

            <BlocCard titre="Avis" icone={Star} couleur="jaune">
              <div className="grid grid-cols-2 gap-4">
                <ChampNombre
                  label="Avis Google reçus"
                  valeur={champs.nb_avis_recus}
                  onChange={(v) => modifier('nb_avis_recus', v)}
                />
              </div>
            </BlocCard>
          </div>

          {erreur && <p className="rounded-lg bg-accent-3/15 px-4 py-3 text-sm text-accent-3">{erreur}</p>}

          <Button onClick={enregistrer} disabled={enregistrement} className="self-start">
            {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      )}

      <Toast message={toast.message} cle={toast.cle} onFermer={toast.fermer} />
    </div>
  )
}
