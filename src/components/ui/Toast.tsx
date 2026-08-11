import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

/** Confirmation flottante qui se déclenche après un enregistrement et
 * disparaît d'elle-même — plus rassurant qu'un texte discret sous un bouton. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const [cle, setCle] = useState(0)

  function montrer(texte: string) {
    setMessage(texte)
    setCle((c) => c + 1)
  }

  return { message, cle, montrer, fermer: () => setMessage(null) }
}

export function Toast({ message, cle, onFermer }: { message: string | null; cle: number; onFermer: () => void }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onFermer, 2600)
    return () => clearTimeout(t)
  }, [message, cle, onFermer])

  if (!message) return null

  return (
    <div
      key={cle}
      role="status"
      className="animate-toast-in fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-bg-elev px-4 py-2.5 text-sm text-text shadow-lg"
    >
      <Check size={16} className="text-accent-2" />
      {message}
    </div>
  )
}
