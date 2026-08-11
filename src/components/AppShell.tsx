import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Home,
  CalendarDays,
  Car,
  ClipboardList,
  FolderOpen,
  Settings,
  ClipboardCheck,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { APP_NAME } from '../lib/config'
import type { Role } from '../types/database'

interface NavItem {
  to: string
  label: string
  /** Libellé plus court pour la barre d'onglets mobile (6 items sur peu de place) — évite un retour à la ligne isolé. */
  labelCourt?: string
  icon: typeof Home
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Accueil', icon: Home, roles: ['admin', 'gerant', 'commercial'] },
  { to: '/ma-semaine', label: 'Ma semaine', icon: CalendarDays, roles: ['gerant', 'commercial'] },
  { to: '/ventes', label: 'Ventes', icon: Car, roles: ['gerant', 'commercial'] },
  {
    to: '/plan-action',
    label: "Plan d'action",
    labelCourt: 'Plan',
    icon: ClipboardList,
    roles: ['admin', 'gerant', 'commercial'],
  },
  { to: '/ressources', label: 'Ressources', icon: FolderOpen, roles: ['admin', 'gerant', 'commercial'] },
  { to: '/parametres', label: 'Paramètres', icon: Settings, roles: ['admin', 'gerant'] },
  { to: '/audit', label: 'Audit', icon: ClipboardCheck, roles: ['admin'] },
]

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  gerant: 'Gérant',
  commercial: 'Commercial',
}

export function AppShell() {
  const { profile, agence, signOut } = useAuth()
  const location = useLocation()

  if (!profile) return null

  const itemsVisibles = NAV_ITEMS.filter((item) => item.roles.includes(profile.role))

  return (
    <div className="min-h-svh md:flex">
      {/* Nav desktop : sidebar, fixée à la hauteur de l'écran (indépendante de la longueur du contenu) */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-line bg-bg-elev md:flex">
        <div className="shrink-0 border-b border-line px-6 py-6">
          <h1 className="font-heading text-xl">{APP_NAME}</h1>
          <p className="mt-1 truncate text-sm text-text-dim">
            {agence ? agence.nom : 'Toutes les agences'}
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {itemsVisibles.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-bg-elev-2 text-text'
                    : 'text-text-dim hover:bg-bg-elev-2 hover:text-text'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-line p-3">
          <div className="px-3 py-2 text-sm">
            <p className="text-text">
              {profile.prenom} {profile.nom}
            </p>
            <p className="text-text-faint">{ROLE_LABELS[profile.role]}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-dim hover:bg-bg-elev-2 hover:text-accent-3"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Nav mobile : header + tab bar bas */}
      <header className="flex items-center justify-between border-b border-line bg-bg-elev px-4 py-3 md:hidden">
        <div>
          <h1 className="font-heading text-lg leading-none">{APP_NAME}</h1>
          <p className="mt-0.5 truncate text-xs text-text-dim">
            {agence ? agence.nom : 'Toutes les agences'}
          </p>
        </div>
        <button
          onClick={() => signOut()}
          aria-label="Déconnexion"
          className="rounded-lg p-2.5 text-text-dim active:bg-bg-elev-2"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <div key={location.pathname} className="animate-page-in">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-bg-elev md:hidden">
        {itemsVisibles.map(({ to, label, labelCourt, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 whitespace-nowrap py-2.5 text-[11px] transition-colors duration-150 ${
                isActive ? 'text-accent-4' : 'text-text-dim'
              }`
            }
          >
            <Icon size={20} />
            {labelCourt ?? label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
