import type { Agence } from '../types/database'

/** Agence sélectionnée par défaut dans les écrans admin : une vraie agence
 * en priorité, jamais un compte démo/test choisi juste parce qu'il arrive
 * en premier dans l'ordre alphabétique. */
export function agenceParDefaut(agences: Agence[]): string {
  return agences.find((a) => !a.est_demo)?.id ?? agences[0]?.id ?? ''
}
