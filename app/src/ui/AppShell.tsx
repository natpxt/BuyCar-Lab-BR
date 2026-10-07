import type { ReactNode } from 'react'
import { useAppState } from '../application/AppStateProvider'

export type AppArea = 'vehicles' | 'comparison' | 'financing' | 'decision'

interface AppShellProps {
  readonly activeArea: AppArea
  readonly children: ReactNode
  onNavigate(area: AppArea): void
}

const areas: readonly { id: AppArea; label: string; description: string }[] = [
  { id: 'vehicles', label: 'Veículos', description: 'Cadastros e custos' },
  { id: 'comparison', label: 'Comparação', description: 'TCO lado a lado' },
  { id: 'financing', label: 'Financiamento', description: 'PRICE e aportes' },
  { id: 'decision', label: 'Ciladômetro', description: 'Decisão final' },
]

export function AppShell({ activeArea, children, onNavigate }: AppShellProps) {
  const { persistenceError, clearAllData } = useAppState()
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">BL</div>
          <div><strong>BuyCar Lab - BR</strong><span>Análise automotiva pessoal</span></div>
        </div>
        <nav className="main-nav" aria-label="Áreas principais">
          {areas.map((area, index) => (
            <button key={area.id} className={activeArea === area.id ? 'nav-item nav-item-active' : 'nav-item'} onClick={() => onNavigate(area.id)}>
              <span className="nav-index">0{index + 1}</span>
              <span><strong>{area.label}</strong><small>{area.description}</small></span>
            </button>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <span>Versão {__APP_VERSION__}</span>
          <button
            className="clear-data"
            onClick={() => {
              if (window.confirm('Apagar todos os veículos e simulações salvos neste navegador? Esta ação não pode ser desfeita.')) {
                clearAllData()
              }
            }}
          >
            Limpar todos os dados
          </button>
        </footer>
      </aside>
      <main className="main-content">
        {persistenceError && (
          <div className="alert alert-error persistence-alert">
            <strong>Erro de persistência.</strong> {persistenceError.message}. Os dados desta sessão foram preservados em memória.
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
