// ============================================================================
// COCKPIT — Palette partagée pour les séries visuelles (camembert CA par
// commercial, courbe d'évolution par agence) : couleurs du système de design,
// cyclées s'il y a plus d'éléments que de couleurs.
// ============================================================================

export const PALETTE_SERIES = [
  'var(--accent-1)',
  'var(--accent-5)',
  'var(--accent-4)',
  'var(--accent-2)',
  'var(--accent-6)',
  'var(--accent-3)',
]

export function couleurSerie(index: number): string {
  return PALETTE_SERIES[index % PALETTE_SERIES.length]
}
