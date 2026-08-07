// ============================================================================
// COCKPIT — Trame du questionnaire d'audit
// Fichier unique regroupant toutes les questions posées lors d'un call d'audit.
// Pour ajouter, retirer ou reformuler une question, c'est ici et nulle part
// ailleurs : le formulaire se construit automatiquement à partir de cette
// structure. Les réponses sont stockées en JSONB (colonne `audits.reponses`),
// indexées par la `cle` de chaque champ — ne pas renommer une `cle` existante
// sous peine de perdre le lien avec les audits déjà saisis.
// ============================================================================

export type TypeChamp = 'texte' | 'texte_long' | 'nombre'

export interface ChampAudit {
  cle: string
  label: string
  type: TypeChamp
  /** Unité affichée à droite du champ (€, %, …). */
  suffixe?: string
}

export interface BlocAudit {
  titre: string
  couleur: 'violet' | 'cyan' | 'orange' | 'vert' | 'rouge' | 'jaune'
  champs: ChampAudit[]
}

export const QUESTIONNAIRE_AUDIT: BlocAudit[] = [
  {
    titre: 'Contexte',
    couleur: 'violet',
    champs: [
      { cle: 'site_web', label: 'Site web', type: 'texte' },
      { cle: 'parcours', label: 'Parcours', type: 'texte_long' },
      { cle: 'date_debut', label: 'Date de début', type: 'texte' },
      { cle: 'motivation_call', label: "Qu'est-ce qui l'a motivé à prendre ce call ?", type: 'texte_long' },
      { cle: 'seul_ou_associe', label: 'Seul ou associé ? Alignement', type: 'texte_long' },
      { cle: 'temps_operationnel', label: "Sur l'opérationnel ? Combien de temps par jour ?", type: 'texte_long' },
      { cle: 'business_model', label: 'Business model', type: 'texte' },
      { cle: 'journee_type', label: 'Journée type — où met-il son énergie ?', type: 'texte_long' },
      { cle: 'journee_type_commerciaux', label: 'Journée type de ses commerciaux', type: 'texte_long' },
    ],
  },
  {
    titre: 'Équipe',
    couleur: 'cyan',
    champs: [
      { cle: 'statuts_equipe', label: 'Statuts (CDI, indépendants…) et ambiance', type: 'texte_long' },
      { cle: 'ca_individuel', label: 'CA mensuel individuel par commercial', type: 'texte_long' },
    ],
  },
  {
    titre: 'Chiffres du mois dernier',
    couleur: 'orange',
    champs: [
      { cle: 'voitures_vendues', label: 'Voitures vendues', type: 'nombre' },
      { cle: 'ca_facture', label: 'CA facturé', type: 'nombre', suffixe: '€' },
      { cle: 'extensions_vendues', label: 'Extensions de garantie vendues', type: 'nombre' },
      { cle: 'frais_mer', label: 'Frais de mise à la route / services', type: 'nombre', suffixe: '€' },
      { cle: 'panier_moyen', label: 'Panier moyen', type: 'nombre', suffixe: '€' },
      { cle: 'taux_rotation', label: 'Taux de rotation', type: 'nombre', suffixe: '%' },
      { cle: 'tresorerie', label: 'Trésorerie', type: 'nombre', suffixe: '€' },
      { cle: 'suivi_client', label: 'Suivi client (si mandat)', type: 'texte' },
    ],
  },
  {
    titre: 'Acquisition & outils',
    couleur: 'vert',
    champs: [
      { cle: 'canaux_acquisition', label: "Canaux d'acquisition", type: 'texte_long' },
      { cle: 'logiciels', label: 'Logiciels utilisés (et leur coût)', type: 'texte_long' },
    ],
  },
  {
    titre: 'Situation & projection',
    couleur: 'rouge',
    champs: [
      { cle: 'stagnation', label: 'Est-ce qu’il stagne ? Depuis quand ?', type: 'texte_long' },
      { cle: 'plan_sortie', label: "S'il stagne, quel est son plan pour s'en sortir ?", type: 'texte_long' },
      { cle: 'ambitions', label: 'Ambitions à 1 an / 3 ans', type: 'texte_long' },
      { cle: 'franchise', label: 'Si franchisé, se sent-il accompagné ?', type: 'texte_long' },
    ],
  },
  {
    titre: 'Synthèse',
    couleur: 'jaune',
    champs: [
      { cle: 'bien', label: 'Ce qui va bien', type: 'texte_long' },
      { cle: 'pas_bien', label: 'Ce qui ne va pas', type: 'texte_long' },
      { cle: 'priorites', label: 'Priorités / actions à engager', type: 'texte_long' },
    ],
  },
]
