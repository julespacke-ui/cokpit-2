import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { Connexion } from './pages/Connexion'
import { AccueilPage } from './pages/Accueil/AccueilPage'
import { ParametresPage } from './pages/Parametres/ParametresPage'
import { MaSemaine } from './pages/MaSemaine'
import { VentesPage } from './pages/Ventes/VentesPage'
import { PlanActionPage } from './pages/PlanAction/PlanActionPage'
import { RessourcesPage } from './pages/Ressources/RessourcesPage'
import { AgenceDetailAdmin } from './pages/Accueil/AgenceDetailAdmin'
import { AuditPage } from './pages/Audit/AuditPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<Connexion />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<AccueilPage />} />

              <Route path="/plan-action" element={<PlanActionPage />} />
              <Route path="/ressources" element={<RessourcesPage />} />
            </Route>

            <Route element={<ProtectedRoute rolesAutorises={['gerant', 'commercial']} />}>
              <Route element={<AppShell />}>
                <Route path="/ma-semaine" element={<MaSemaine />} />
                <Route path="/ventes" element={<VentesPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute rolesAutorises={['admin', 'gerant']} />}>
              <Route element={<AppShell />}>
                <Route path="/parametres" element={<ParametresPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute rolesAutorises={['admin']} />}>
              <Route element={<AppShell />}>
                <Route path="/agence/:agenceId" element={<AgenceDetailAdmin />} />
                <Route path="/audit" element={<AuditPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
