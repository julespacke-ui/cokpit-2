import { useAuth } from '../../contexts/AuthContext'
import { CommercialAccueil } from './CommercialAccueil'
import { GerantAccueil } from './GerantAccueil'
import { AdminAccueil } from './AdminAccueil'

export function AccueilPage() {
  const { profile } = useAuth()
  if (!profile) return null

  if (profile.role === 'commercial') return <CommercialAccueil />
  if (profile.role === 'gerant') return <GerantAccueil />
  return <AdminAccueil />
}
