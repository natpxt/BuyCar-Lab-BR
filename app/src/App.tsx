import { lazy, Suspense, useState } from 'react'
import { AppShell, type AppArea } from './ui/AppShell'
import { ComparisonScreen } from './ui/ComparisonScreen'
import { DecisionDashboardScreen } from './ui/DecisionDashboardScreen'
import { VehiclesScreen } from './ui/VehiclesScreen'
import './app.css'

const FinancingScreen = lazy(() => import('./ui/FinancingScreen').then(
  (module) => ({ default: module.FinancingScreen }),
))

function App() {
  const [activeArea, setActiveArea] = useState<AppArea>('vehicles')
  return (
    <AppShell activeArea={activeArea} onNavigate={setActiveArea}>
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
