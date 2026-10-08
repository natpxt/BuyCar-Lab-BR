import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppStateProvider } from './application/AppStateProvider.tsx'
import { loadThemePreference } from './application/themePreference.ts'

const initialTheme = loadThemePreference(
  window.localStorage,
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
)
document.documentElement.dataset.theme = initialTheme
document.documentElement.style.colorScheme = initialTheme

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      <App />
    </AppStateProvider>
  </StrictMode>,
)
