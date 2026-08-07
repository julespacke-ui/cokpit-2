interface ToggleProps {
  checked: boolean
  onChange: (valeur: boolean) => void
  label: string
}

/**
 * Rendu visuel seul de l'interrupteur (sans interaction). Sert à l'intérieur
 * d'un élément cliquable plus large — par ex. une ligne entière de routine —
 * où imbriquer un <button> dans un <button> serait invalide.
 */
export function ToggleVisuel({ checked }: { checked: boolean }) {
  return (
    <span
      // La bordure est présente dans les deux états : sans ça, la largeur
      // intérieure change au basculement et le rond sort du cadran.
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
        checked ? 'border-accent-2 bg-accent-2' : 'border-line bg-bg-elev-2'
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
        }`}
      />
    </span>
  )
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"
    >
      <ToggleVisuel checked={checked} />
    </button>
  )
}
