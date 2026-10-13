import { lazy, Suspense, useState } from 'react'
import { AppShell, type AppArea } from './ui/AppShell'
import { ComparisonScreen } from './ui/ComparisonScreen'
import { DecisionDashboardScreen } from './ui/DecisionDashboardScreen'
import { VehiclesScreen } from './ui/VehiclesScreen'
import { AccountSettingsScreen } from './ui/AccountSettingsScreen'
import './app.css'

const FinancingScreen = lazy(() => import('./ui/FinancingScreen').then(
  (module) => ({ default: module.FinancingScreen }),
))

function App() {
  const [activeArea, setActiveArea] = useState<AppArea>('vehicles')
  const [previousArea, setPreviousArea] = useState<AppArea>('vehicles')
  function navigate(area: AppArea) {
    if (area === 'account' && activeArea !== 'account') setPreviousArea(activeArea)
    setActiveArea(area)
  }
  return (
    <AppShell activeArea={activeArea} onNavigate={navigate}>
      {activeArea === 'account' && <AccountSettingsScreen onBack={() => setActiveArea(previousArea)} />}
      {activeArea === 'vehicles' && <VehiclesScreen />}
      {activeArea === 'comparison' && <ComparisonScreen />}
      {activeArea === 'financing' && (
        <Suspense fallback={<div className="empty-state"><p>Carregando laboratório de financiamento…</p></div>}>
          <FinancingScreen />
        </Suspense>
      )}
      {activeArea === 'decision' && <DecisionDashboardScreen />}
    </AppShell>
  )
}

export default App
