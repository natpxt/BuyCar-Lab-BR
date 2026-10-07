import { useState } from 'react'
import { AppShell, type AppArea } from './ui/AppShell'
import { ComparisonScreen } from './ui/ComparisonScreen'
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
    </AppShell>
  )
}

export default App
