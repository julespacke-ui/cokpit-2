// ============================================================================
// COCKPIT — Formules de calcul
// Fichier unique pour toutes les formules dérivées (jamais saisies à la
// main). Regroupées ici pour rester faciles à ajuster sans toucher aux
// composants qui les utilisent.
// ============================================================================

import type { SaisieHebdo, TrancheHonoraires } from '../types/database'

/**
 * Honoraires préconisés par le barème pour un prix de vente donné.
 * Cherche la tranche dans laquelle tombe le prix (min <= prix < max), puis
 * applique soit un montant fixe, soit un pourcentage du prix de vente (avec
 * un plancher optionnel en dessous duquel les honoraires ne descendent pas).
 * Retourne 0 si aucune tranche ne couvre le prix (barème mal configuré).
 */
export function calculerHonorairesPreconises(prixVente: number, tranches: TrancheHonoraires[]): number {
  const tranche = tranches.find((t) => prixVente >= t.min && prixVente < t.max)
  if (!tranche) return 0

  if (tranche.mode === 'fixe') {
    return tranche.valeur
  }

  const montant = (prixVente * tranche.valeur) / 100
  return tranche.plancher ? Math.max(montant, tranche.plancher) : montant
}

/**
 * Panier moyen d'une vente = honoraires réels + pack de mise à la route
 * + extension de garantie + services additionnels.
 * La carte grise est volontairement exclue : c'est un montant collecté puis
 * reversé à l'ANTS, pas du chiffre d'affaires de l'agence.
 */
export function calculerPanierVente(params: {
  honorairesReels: number
  prixPackMer?: number
  prixExtensionGarantie?: number
  services: { prix: number }[]
}): number {
  const totalServices = params.services.reduce((somme, s) => somme + s.prix, 0)
  return (
    params.honorairesReels + (params.prixPackMer ?? 0) + (params.prixExtensionGarantie ?? 0) + totalServices
  )
}

// ============================================================================
// Taux de conversion des funnels (vendeurs et acheteurs)
// ============================================================================

/**
 * Taux de conversion générique entre deux étapes d'un funnel, en %.
 * Utilisé pour : rdv_venus/rdv_pris, visites/propositions, ventes/visites, etc.
 */
export function tauxConversion(numerateur: number, denominateur: number): number {
  if (denominateur === 0) return 0
  return (numerateur / denominateur) * 100
}

/** Taux d'entrée : proportion des RDV venus qui débouchent sur un mandat rentré. */
export function tauxEntree(mandatsRentres: number, rdvVenus: number): number {
  return tauxConversion(mandatsRentres, rdvVenus)
}

// ============================================================================
// Stock
// ============================================================================

/**
 * Taux de rotation du stock sur une période.
 * Formule provisoire (à affiner) : ventes de la période / (stock en début de
 * période + entrées de la période). Isolée ici pour rester facile à ajuster
 * sans toucher au reste du code.
 */
export function tauxRotation(ventesPeriode: number, stockDebutPeriode: number, entreesPeriode: number): number {
  const disponible = stockDebutPeriode + entreesPeriode
  if (disponible === 0) return 0
  return (ventesPeriode / disponible) * 100
}

/** Taux de sortie = sorties de stock / stock disponible sur la période (stock début + entrées). */
export function tauxSortie(sortiesPeriode: number, stockDisponible: number): number {
  if (stockDisponible === 0) return 0
  return (sortiesPeriode / stockDisponible) * 100
}

// ============================================================================
// Indicateurs calculés à partir des fiches ventes
// ============================================================================

interface VentePourIndicateurs {
  honoraires_reels: number
  honoraires_preconises: number
  origine_vente: string
  nb_avis: number
  extension_garantie_id: string | null
}

/** Honoraires moyens (moyenne simple des honoraires réels) sur un ensemble de ventes. */
export function honorairesMoyens(ventes: { honoraires_reels: number }[]): number {
  if (ventes.length === 0) return 0
  return ventes.reduce((somme, v) => somme + v.honoraires_reels, 0) / ventes.length
}

/**
 * Résistance honoraires = moyenne de (honoraires réels / honoraires préconisés),
 * en %. 100 % = aucune négociation à la baisse en moyenne.
 */
export function resistanceHonoraires(ventes: VentePourIndicateurs[]): number {
  const ventesAvecPreconise = ventes.filter((v) => v.honoraires_preconises > 0)
  if (ventesAvecPreconise.length === 0) return 0
  const somme = ventesAvecPreconise.reduce((acc, v) => acc + v.honoraires_reels / v.honoraires_preconises, 0)
  return (somme / ventesAvecPreconise.length) * 100
}

/** Taux d'extension de garantie = ventes avec extension / ventes totales, en %. */
export function tauxExtensionGarantie(ventes: VentePourIndicateurs[]): number {
  if (ventes.length === 0) return 0
  const avecExtension = ventes.filter((v) => v.extension_garantie_id !== null).length
  return (avecExtension / ventes.length) * 100
}

/** Taux de recommandation = ventes d'origine "recommandation" / ventes totales, en %. */
export function tauxRecommandation(ventes: VentePourIndicateurs[]): number {
  if (ventes.length === 0) return 0
  const recommandations = ventes.filter((v) => v.origine_vente === 'recommandation').length
  return (recommandations / ventes.length) * 100
}

/**
 * Ratio avis/ventes = somme des avis reçus / avis maximum possible, en %.
 * Une vente peut générer jusqu'à 2 avis (acheteur + vendeur) : le maximum
 * possible est donc ventes × 2, pas simplement le nombre de ventes.
 */
export function ratioAvisVentes(ventes: VentePourIndicateurs[]): number {
  if (ventes.length === 0) return 0
  const totalAvis = ventes.reduce((somme, v) => somme + v.nb_avis, 0)
  return (totalAvis / (ventes.length * 2)) * 100
}

/** Panier moyen agrégé sur un ensemble de paniers déjà calculés (calculerPanierVente). */
export function panierMoyen(paniers: number[]): number {
  if (paniers.length === 0) return 0
  return paniers.reduce((somme, p) => somme + p, 0) / paniers.length
}

/** Chiffre d'affaires de la période = somme des paniers de toutes les ventes (calculerPanierVente). */
export function chiffreAffaires(paniers: number[]): number {
  return paniers.reduce((somme, p) => somme + p, 0)
}

// ============================================================================
// Agrégation des saisies hebdomadaires sur une période
// ============================================================================

export interface AgregatSaisies {
  appelsPasses: number
  leadsTraites: number
  rdvPris: number
  rdvVenus: number
  mandatsRentres: number
  leadsAcheteurs: number
  propositionsCommerciales: number
  visites: number
  videosPostees: number
  prospectionsExterieures: number
  nbAvisRecus: number
  stockEntrees: number
  stockSorties: number
}

const AGREGAT_VIDE: AgregatSaisies = {
  appelsPasses: 0,
  leadsTraites: 0,
  rdvPris: 0,
  rdvVenus: 0,
  mandatsRentres: 0,
  leadsAcheteurs: 0,
  propositionsCommerciales: 0,
  visites: 0,
  videosPostees: 0,
  prospectionsExterieures: 0,
  nbAvisRecus: 0,
  stockEntrees: 0,
  stockSorties: 0,
}

/** Somme des compteurs de plusieurs saisies hebdomadaires (une agence ou un commercial sur une période). */
export function agregerSaisies(saisies: SaisieHebdo[]): AgregatSaisies {
  return saisies.reduce(
    (acc, s) => ({
      appelsPasses: acc.appelsPasses + s.appels_passes,
      leadsTraites: acc.leadsTraites + s.leads_traites,
      rdvPris: acc.rdvPris + s.rdv_pris,
      rdvVenus: acc.rdvVenus + s.rdv_venus,
      mandatsRentres: acc.mandatsRentres + s.mandats_rentres,
      leadsAcheteurs: acc.leadsAcheteurs + s.leads_acheteurs,
      propositionsCommerciales: acc.propositionsCommerciales + s.propositions_commerciales,
      visites: acc.visites + s.visites,
      videosPostees: acc.videosPostees + s.videos_postees,
      prospectionsExterieures: acc.prospectionsExterieures + s.prospections_exterieures,
      nbAvisRecus: acc.nbAvisRecus + s.nb_avis_recus,
      stockEntrees: acc.stockEntrees + s.stock_entrees,
      stockSorties: acc.stockSorties + s.stock_sorties,
    }),
    AGREGAT_VIDE,
  )
}

// ============================================================================
// Suivi de remplissage hebdomadaire (alertes de non-remplissage)
// ============================================================================

export type StatutSemaine = 'remplie' | 'retard' | 'neutre'

/**
 * Statut d'une semaine de saisie : remplie dès qu'une saisie existe (même en
 * retard), en retard si plus de 7 jours se sont écoulés depuis le lundi de
 * cette semaine sans saisie, neutre sinon (semaine trop récente pour être en
 * retard, ex. la semaine en cours).
 */
export function calculerStatutSemaine(lundi: Date, aujourdHui: Date, remplie: boolean): StatutSemaine {
  if (remplie) return 'remplie'
  const joursEcoules = Math.floor((aujourdHui.getTime() - lundi.getTime()) / 86400000)
  return joursEcoules > 7 ? 'retard' : 'neutre'
}
