import { useState, type FormEvent } from 'react'
import { ChevronDown, UserRound } from 'lucide-react'
import { useAuth } from '../application/AuthProvider'
import { useAppState } from '../application/AppStateProvider'
import { AppIcon } from './AppIcon'

type AccountView = 'login' | 'signup' | 'reset'

function authMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('Invalid login credentials')) return 'Email ou senha incorretos.'
  if (message.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.'
  if (message.includes('User already registered')) return 'Este email já está cadastrado.'
  if (message.includes('Email address not authorized')) return 'Este email ainda não está autorizado para receber confirmações neste projeto.'
  return message
}

export function AccountMenu() {
  const auth = useAuth()
  const { storageMode, flushPending, hasLocalGarage, syncing, importLocalGarage } = useAppState()
  const [view, setView] = useState<AccountView>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if ((view === 'signup' || auth.passwordRecovery) && password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    try {
      if (auth.passwordRecovery) {
        await auth.updatePassword(password)
        setNotice('Senha atualizada. Sua conta está pronta para uso.')
      } else if (view === 'signup') {
        await auth.signUp(name, email, password)
        setNotice('Cadastro recebido. Abra o link enviado ao seu email para confirmar a conta.')
      } else if (view === 'reset') {
        await auth.resetPassword(email)
        setNotice('Se houver uma conta com esse email, enviaremos um link de recuperação.')
      } else {
        await auth.signIn(email, password)
        setPassword('')
      }
    } catch (caught) {
      setError(authMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  async function leaveAccount() {
    setError('')
    setBusy(true)
    try {
      await flushPending()
      await auth.signOut()
      setPassword('')
      setConfirmation('')
      setNotice('Você saiu da conta. A garagem local deste navegador continua disponível.')
    } catch (caught) {
      setError(authMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  async function importGarage() {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const imported = await importLocalGarage()
      if (imported) setNotice('Garagem local importada para sua conta. A cópia deste navegador foi preservada.')
    } catch (caught) {
      setError(authMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const accountName = typeof auth.user?.user_metadata.display_name === 'string'
    ? auth.user.user_metadata.display_name
    : auth.user?.email?.split('@')[0]

  return (
    <details className="account-menu">
      <summary aria-label="Abrir área da conta">
        <span className="account-avatar" aria-hidden="true"><AppIcon icon={UserRound} /></span>
        <span><strong>{auth.user ? accountName : 'Entrar'}</strong><small>{auth.user ? 'Sua conta' : 'Continuar sem conta'}</small></span>
        <AppIcon icon={ChevronDown} size={16} />
      </summary>
      <div className="account-menu-panel">
        {auth.user && !auth.passwordRecovery ? (
          <>
            <strong>Garagem de {accountName}</strong>
            <p>{auth.user.email}</p>
            <small>{storageMode === 'cloud'
              ? syncing ? 'Sincronizando garagem…' : 'Garagem vinculada à sua conta.'
              : 'Carregando garagem…'}</small>
            {hasLocalGarage && <button type="button" className="account-secondary-action" disabled={busy} onClick={() => void importGarage()}>Importar garagem deste navegador</button>}
            {error && <p className="account-message account-message-error" role="alert">{error}</p>}
            {notice && <p className="account-message" role="status">{notice}</p>}
            <button type="button" className="account-primary-action" disabled={busy} onClick={() => void leaveAccount()}>
              {busy ? 'Saindo…' : 'Sair da conta'}
            </button>
          </>
        ) : !auth.available ? (
          <>
            <strong>Continuar sem conta</strong>
            <p>Seus dados ficam neste navegador. A conexão com contas ainda não foi configurada neste ambiente.</p>
          </>
        ) : (
          <>
            <strong>{auth.passwordRecovery ? 'Criar nova senha' : view === 'signup' ? 'Criar conta' : view === 'reset' ? 'Recuperar senha' : 'Entrar na conta'}</strong>
            <p>Você pode continuar sem conta. Nesse caso, a garagem fica só neste navegador e pode ser perdida ao limpar os dados do site.</p>
            <form className="account-form" onSubmit={(event) => void submit(event)}>
              {view === 'signup' && !auth.passwordRecovery && (
                <label>Nome<input required autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
              )}
              {!auth.passwordRecovery && (
                <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              )}
              {(view !== 'reset' || auth.passwordRecovery) && (
                <label>Senha<input required type="password" minLength={6} autoComplete={view === 'login' && !auth.passwordRecovery ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              )}
              {(view === 'signup' || auth.passwordRecovery) && (
                <label>Confirmar senha<input required type="password" minLength={6} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
              )}
              {error && <p className="account-message account-message-error" role="alert">{error}</p>}
              {notice && <p className="account-message" role="status">{notice}</p>}
              <button type="submit" className="account-primary-action" disabled={busy}>
                {busy ? 'Aguarde…' : auth.passwordRecovery ? 'Salvar nova senha' : view === 'signup' ? 'Criar conta' : view === 'reset' ? 'Enviar link' : 'Entrar'}
              </button>
            </form>
            {!auth.passwordRecovery && (
              <div className="account-form-links">
                {view !== 'login' && <button type="button" onClick={() => { setView('login'); setError(''); setNotice('') }}>Já tenho conta</button>}
                {view !== 'signup' && <button type="button" onClick={() => { setView('signup'); setError(''); setNotice('') }}>Criar conta</button>}
                {view !== 'reset' && <button type="button" onClick={() => { setView('reset'); setError(''); setNotice('') }}>Esqueci a senha</button>}
              </div>
            )}
          </>
        )}
      </div>
    </details>
  )
}
