import { useEffect, useState, type ReactNode } from 'react'
import { useAppState } from '../application/AppStateProvider'
import { AccountMenu } from './AccountMenu'
import { CarFront, Gauge, GitCompareArrows, Landmark, Moon, Sun } from 'lucide-react'
import { AppIcon } from './AppIcon'
import {
  loadThemePreference,
  oppositeTheme,
  saveThemePreference,
  type ThemeMode,
} from '../application/themePreference'

export type AppArea = 'vehicles' | 'comparison' | 'financing' | 'decision' | 'account'

interface AppShellProps {
  readonly activeArea: AppArea
  readonly children: ReactNode
  onNavigate(area: AppArea): void
}

const areas: readonly { id: Exclude<AppArea, 'account'>; label: string; description: string }[] = [
  { id: 'vehicles', label: 'Garagem', description: 'Seus veículos e custos' },
  { id: 'comparison', label: 'Comparação', description: 'TCO lado a lado' },
  { id: 'financing', label: 'Financiamento', description: 'Contrato e amortizações' },
  { id: 'decision', label: 'Ciladômetro', description: 'Decisão final' },
]

function prefersDarkTheme(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function AppShell({ activeArea, children, onNavigate }: AppShellProps) {
  const { persistenceError, storageMode, retrySave } = useAppState()
  const [theme, setTheme] = useState<ThemeMode>(() => (
    loadThemePreference(window.localStorage, prefersDarkTheme())
  ))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    saveThemePreference(window.localStorage, theme)
  }, [theme])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}brand/logo-estrada-b.png`} alt="" />
          </div>
          <div><strong>BuyCar Lab - BR</strong><span>É cilada ou não?</span></div>
        </div>
        <nav className="main-nav" aria-label="Áreas principais">
          {areas.map((area) => (
            <button key={area.id} className={activeArea === area.id ? 'nav-item nav-item-active' : 'nav-item'} aria-current={activeArea === area.id ? 'page' : undefined} onClick={() => onNavigate(area.id)}>
              <span className="nav-icon"><AppIcon icon={{ vehicles: CarFront, comparison: GitCompareArrows, financing: Landmark, decision: Gauge }[area.id]} size={24} /></span>
              <span><strong>{area.label}</strong><small>{area.description}</small></span>
            </button>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <button
            type="button"
            className="theme-toggle sidebar-theme-toggle"
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme((current) => oppositeTheme(current))}
          >
            <AppIcon icon={Sun} />
            <span className="theme-toggle-track" aria-hidden="true"><span className="theme-toggle-thumb" /></span>
            <AppIcon icon={Moon} />
          </button>
          <span>Versão {__APP_VERSION__}</span>
        </footer>
      </aside>

      <div className="workspace">
        <header className="workspace-topbar">
          <div className="topbar-actions">
            <AccountMenu onSettings={() => onNavigate('account')} />
          </div>
        </header>

        <main className="main-content">
          {persistenceError && (
            <div className="alert alert-error persistence-alert">
              <strong>Erro de persistência.</strong> {persistenceError.message}. Os dados desta sessão foram preservados em memória.
              {storageMode === 'cloud' && <button type="button" onClick={retrySave}>Revisar e sincronizar</button>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
