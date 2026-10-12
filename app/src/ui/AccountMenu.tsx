import { ChevronDown, UserRound } from 'lucide-react'
import { AppIcon } from './AppIcon'

export function AccountMenu() {
  return (
    <details className="account-menu">
      <summary aria-label="Abrir área de login">
        <span className="account-avatar" aria-hidden="true">
          <AppIcon icon={UserRound} />
        </span>
        <span><strong>Entrar</strong><small>Sua conta</small></span>
        <AppIcon icon={ChevronDown} size={16} />
      </summary>
      <div className="account-menu-panel">
        <strong>Sua conta</strong>
        <p>O login será habilitado em breve. Por enquanto, sua garagem fica salva neste navegador.</p>
        <small>Ao entrar, seu nome e foto aparecerão aqui.</small>
      </div>
    </details>
  )
}
