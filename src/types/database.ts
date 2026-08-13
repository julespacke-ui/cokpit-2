// Types générés à la main d'après supabase/migrations/0001_schema.sql
// À régénérer/étendre au fil des modules si le schéma évolue.

export type Role = 'admin' | 'gerant' | 'commercial'

export type OrigineVente =
  | 'recommandation'
  | 'lead_internet'
  | 'reseaux_sociaux'
  | 'prospection'
  | 'passage'
  | 'liste_chaude'
  | 'autre'

export type CategorieRessource =
  | 'calendrier_editorial'
  | 'trames'
  | 'positionnement'
  | 'strategie_com'
  | 'post_livraison'
  | 'autre'

export const CATEGORIE_RESSOURCE_LABELS: Record<CategorieRessource, string> = {
  calendrier_editorial: 'Calendrier éditorial',
  trames: 'Trames',
  positionnement: 'Positionnement',
  strategie_com: 'Stratégie com',
  post_livraison: 'Post-livraison',
  autre: 'Autre',
}

export const ORDRE_CATEGORIES_RESSOURCE: CategorieRessource[] = [
  'calendrier_editorial',
  'trames',
  'positionnement',
  'strategie_com',
  'post_livraison',
  'autre',
]

export interface Agence {
  id: string
  nom: string
  ville: string | null
  logo_url: string | null
  /** Valeur de départ fixe du CA, saisie une fois — jamais recalculée automatiquement. */
  ca_baseline: number | null
  /** Compte de démo/test, exclu par défaut du benchmark inter-agences. */
  est_demo: boolean
  created_at: string
}

export interface Profile {
  id: string
  agence_id: string
  role: Role
  prenom: string
  nom: string
  actif: boolean
  created_at: string
}

export type ModeTranche = 'fixe' | 'pourcentage'

export interface TrancheHonoraires {
  min: number
  max: number
  mode: ModeTranche
  valeur: number // montant en € si mode = 'fixe', taux en % si mode = 'pourcentage'
  plancher?: number // optionnel, honoraires minimum en € si mode = 'pourcentage'
}

export interface BaremeHonoraires {
  id: string
  agence_id: string
  type: 'tranches'
  config: { tranches: TrancheHonoraires[] }
  updated_at: string
}

export interface PackMer {
  id: string
  agence_id: string
  nom: string
  prix: number
  actif: boolean
}

export interface ExtensionGarantie {
  id: string
  agence_id: string
  nom: string
  prix_client: number
  commission_agence: number
  actif: boolean
}

export interface SaisieHebdo {
  id: string
  commercial_id: string
  agence_id: string
  semaine: string // date ISO (lundi)

  appels_passes: number
  leads_traites: number
  rdv_pris: number
  rdv_venus: number
  mandats_rentres: number

  leads_acheteurs: number
  propositions_commerciales: number
  visites: number

  videos_postees: number
  prospections_exterieures: number

  liste_chaude_levee: boolean
  sortie_prospection_faite: boolean
  videos_prevues_publiees: boolean

  stock_entrees: number
  stock_sorties: number
  stock_total: number

  nb_avis_recus: number

  created_at: string
  updated_at: string
}

export interface Vente {
  id: string
  commercial_id: string
  agence_id: string
  date_vente: string
  vehicule: string
  prix_vente: number
  honoraires_preconises: number
  honoraires_reels: number
  pack_mer_id: string | null
  carte_grise_montant: number
  extension_garantie_id: string | null
  origine_vente: OrigineVente
  /** 0, 1 ou 2 — une transaction peut générer jusqu'à deux avis (acheteur + vendeur). */
  nb_avis: number
  created_at: string
  updated_at: string
}

export interface VenteService {
  id: string
  vente_id: string
  libelle: string
  prix: number
}

export interface Objectif {
  id: string
  agence_id: string
  commercial_id: string | null
  periode: string // premier jour du mois
  cibles: Record<string, number>
  created_at: string
}

export interface PlanAction {
  id: string
  agence_id: string
  commercial_id: string
  titre: string
  storage_path: string
  date_upload: string
}

export interface Ressource {
  id: string
  /** Null = ressource commune à tous les points de vente. */
  agence_id: string | null
  type: 'lien' | 'fichier'
  libelle: string
  url: string | null
  storage_path: string | null
  categorie: CategorieRessource
  created_at: string
}

export interface Audit {
  id: string
  /** Null tant que le prospect n'est pas devenu client (cf. migration 0005). */
  agence_id: string | null
  /** Nom libre, utilisé quand l'audit porte sur un prospect sans agence. */
  nom_prospect: string | null
  date: string
  reponses: Record<string, string | number>
  created_at: string
}
