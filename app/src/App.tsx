import { useState } from 'react'
import { AppShell, type AppArea } from './ui/AppShell'
import { ComparisonScreen } from './ui/ComparisonScreen'
import { DecisionDashboardScreen } from './ui/DecisionDashboardScreen'
import { FinancingScreen } from './ui/FinancingScreen'
import { VehiclesScreen } from './ui/VehiclesScreen'
import './app.css'

function App() {
  const [activeArea, setActiveArea] = useState<AppArea>('vehicles')
  return (
    <AppShell activeArea={activeArea} onNavigate={setActiveArea}>
      {activeArea === 'vehicles' && <VehiclesScreen />}
      {activeArea === 'comparison' && <ComparisonScreen />}
      {activeArea === 'financing' && <FinancingScreen />}
      {activeArea === 'decision' && <DecisionDashboardScreen />}
    </AppShell>
  )
}

export default App
