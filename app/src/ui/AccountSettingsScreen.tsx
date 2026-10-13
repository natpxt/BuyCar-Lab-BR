import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Camera, LockKeyhole, Mail, Trash2, UserRound } from 'lucide-react'
import { useAuth } from '../application/AuthProvider'
import { useAppState } from '../application/AppStateProvider'
import { removeAvatar, saveAvatar, validateProfilePhoto } from '../application/profilePhoto'
import { AppIcon } from './AppIcon'

type Feedback = { area: 'account' | 'data'; text: string; error?: boolean }

export function AccountSettingsScreen({ onBack }: { onBack(): void }) {
  const auth = useAuth()
  const { storageMode, clearAllData, hasLocalGarage, importLocalGarage } = useAppState()
  const [editing, setEditing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  function startEditing() {
    setName(auth.displayName)
    setEmail(auth.user?.email ?? '')
    setPassword('')
    setPasswordConfirmation('')
    setPhotoFile(null)
    setRemovePhoto(false)
    setFeedback(null)
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setConfirmOpen(false)
    setPhotoFile(null)
    setRemovePhoto(false)
    setPassword('')
    setPasswordConfirmation('')
  }

  function choosePhoto(file: File | undefined) {
    if (!file) return
    try {
      validateProfilePhoto(file)
      setPhotoFile(file)
      setRemovePhoto(false)
      setFeedback(null)
    } catch (error) {
      setFeedback({ area: 'account', text: error instanceof Error ? error.message : 'Imagem inválida.', error: true })
    }
  }

  const nameChanged = name.trim() !== auth.displayName
  const emailChanged = email.trim().toLowerCase() !== auth.user?.email?.toLowerCase()
  const changed = nameChanged || emailChanged || Boolean(password) || Boolean(photoFile) || removePhoto

  function requestSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) { setFeedback({ area: 'account', text: 'Informe seu nome.', error: true }); return }
    if (password !== passwordConfirmation) { setFeedback({ area: 'account', text: 'As senhas não coincidem.', error: true }); return }
    if (!changed) return
    setFeedback(null)
    setConfirmOpen(true)
  }

  async function saveChanges() {
    const user = auth.user
    if (!user || busy) return
    setConfirmOpen(false)
    setBusy(true)
    const completed: string[] = []
    try {
      if (nameChanged) { await auth.updateName(name); completed.push('nome') }
      if (photoFile) {
        await saveAvatar(user.id, name.trim(), photoFile)
        await auth.refreshProfile()
        setPhotoFile(null)
        completed.push('foto')
      } else if (removePhoto) {
        await removeAvatar(user.id)
        await auth.refreshProfile()
        setRemovePhoto(false)
        completed.push('foto')
      }
      if (password) {
        await auth.updatePassword(password)
        setPassword('')
        setPasswordConfirmation('')
        completed.push('senha')
      }
      if (emailChanged) { await auth.updateEmail(email.trim()); completed.push('email') }
      setEditing(false)
      setFeedback({
        area: 'account',
        text: emailChanged
          ? 'Alterações salvas. Confirme o novo email pelo link enviado; o endereço antigo também pode exigir confirmação.'
          : 'Alterações da conta salvas.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar as alterações.'
      setFeedback({ area: 'account', text: `${completed.length ? `${completed.join(', ')} salvo(s). ` : ''}Não foi possível concluir: ${message}`, error: true })
    } finally { setBusy(false) }
  }

  async function importGarage() {
    setBusy(true)
    setFeedback(null)
    try {
      const imported = await importLocalGarage()
      if (imported) setFeedback({ area: 'data', text: 'Garagem local importada para a conta.' })
    } catch (error) {
      setFeedback({ area: 'data', text: error instanceof Error ? error.message : 'Não foi possível importar.', error: true })
    } finally { setBusy(false) }
  }

  function clearData() {
    const target = storageMode === 'cloud' ? 'da sua conta' : 'deste navegador'
    if (window.confirm(`Apagar todos os veículos e simulações ${target}? Esta ação não pode ser desfeita.`)) {
      clearAllData()
      setFeedback({ area: 'data', text: 'Dados da garagem apagados. Sua conta continua ativa.' })
    }
  }

  const status = (area: Feedback['area']) => feedback?.area === area && (
    <p className={feedback.error ? 'account-message account-message-error' : 'account-message'} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>
  )
  const avatar = photoPreview || (!removePhoto ? auth.avatarUrl : null)

  return (
    <div className="settings-page">
      <button className="settings-back" type="button" onClick={editing ? cancelEditing : onBack}><AppIcon icon={ArrowLeft} size={20} /> {editing ? 'Voltar às configurações' : 'Voltar'}</button>
      <header className="settings-heading"><h1>{editing ? 'Alterar dados' : 'Configurações da conta'}</h1><p>{editing ? 'Revise suas alterações antes de salvar.' : 'Consulte seu perfil e os dados da garagem.'}</p></header>
      {auth.user ? editing ? (
        <form className="settings-edit-form" onSubmit={requestSave}>
          <section className="settings-card" aria-labelledby="edit-profile-title">
            <h2 id="edit-profile-title"><AppIcon icon={UserRound} size={20} /> Foto e dados pessoais</h2>
            <div className="settings-edit-photo">
              <div className="settings-avatar" aria-hidden="true">{avatar ? <img src={avatar} alt="" /> : <AppIcon icon={UserRound} size={24} />}</div>
              <div className="settings-photo-actions">
                <label className="settings-file-button"><AppIcon icon={Camera} size={16} /> Escolher foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { choosePhoto(event.target.files?.[0]); event.target.value = '' }} /></label>
                {avatar && <button type="button" className="settings-text-button" disabled={busy} onClick={() => { setPhotoFile(null); setRemovePhoto(Boolean(auth.avatarUrl)) }}>Remover foto</button>}
                <small>JPG, PNG ou WebP, até 2 MB. A foto só muda após salvar.</small>
              </div>
            </div>
            <div className="settings-fields">
              <label>Nome<input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            </div>
          </section>
          <section className="settings-card" aria-labelledby="edit-password-title">
            <h2 id="edit-password-title"><AppIcon icon={LockKeyhole} size={20} /> Senha</h2>
            <p>Deixe os campos vazios para manter a senha atual.</p>
            <div className="settings-fields">
              <label>Nova senha<input type="password" minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <label>Confirmar nova senha<input type="password" minLength={6} autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>
            </div>
          </section>
          {status('account')}
          <div className="settings-edit-actions"><button type="button" className="settings-secondary" disabled={busy} onClick={cancelEditing}>Cancelar</button><button type="submit" className="settings-save" disabled={busy || !changed}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
        </form>
      ) : (
        <>
          <section className="settings-card settings-profile" aria-labelledby="profile-title">
            <div className="settings-avatar" aria-hidden="true">{auth.avatarUrl ? <img src={auth.avatarUrl} alt="" /> : <AppIcon icon={UserRound} size={24} />}</div>
            <div className="settings-profile-info"><h2 id="profile-title">{auth.displayName || 'Seu perfil'}</h2><p>{auth.user.email}</p><small>Conta conectada</small></div>
            <button type="button" className="settings-save" onClick={startEditing}>Alterar dados</button>
          </section>
          <div className="settings-grid">
            <section className="settings-card" aria-labelledby="personal-title"><h2 id="personal-title"><AppIcon icon={UserRound} size={20} /> Dados pessoais</h2><dl className="settings-details"><dt>Nome</dt><dd>{auth.displayName || 'Não informado'}</dd><dt>Email</dt><dd>{auth.user.email}</dd></dl></section>
            <section className="settings-card" aria-labelledby="security-title"><h2 id="security-title"><AppIcon icon={LockKeyhole} size={20} /> Senha e acesso</h2><p>Sua senha está protegida. Use “Alterar dados” para criar outra.</p></section>
          </div>
          {status('account')}
        </>
      ) : (
        <section className="settings-card settings-guest"><AppIcon icon={Mail} size={24} /><div><h2>Você está usando sem conta</h2><p>Sua garagem fica somente neste navegador e pode ser perdida ao limpar os dados do site. {auth.available ? 'Para sincronizar entre dispositivos, abra o menu “Entrar” no topo e crie uma conta.' : 'O acesso à conta não está configurado neste ambiente.'}</p></div></section>
      )}
      <section className="settings-card settings-data" aria-labelledby="data-title"><h2 id="data-title"><AppIcon icon={Trash2} size={20} /> Dados da garagem</h2>
        <p>{storageMode === 'cloud' ? 'Os veículos e simulações desta conta são sincronizados pelo Supabase. Apagar a garagem não exclui sua conta nem a cópia local deste navegador.' : 'Os veículos e simulações estão salvos somente neste navegador.'}</p>
        {auth.user && hasLocalGarage && <button type="button" className="settings-secondary" disabled={busy} onClick={() => void importGarage()}>Importar garagem deste navegador</button>}
        <button className="settings-danger" type="button" disabled={busy} onClick={clearData}>Limpar dados {storageMode === 'cloud' ? 'da conta' : 'deste navegador'}</button>{status('data')}
      </section>
      {confirmOpen && (
        <div className="settings-dialog-backdrop">
          <div className="settings-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" onKeyDown={(event) => { if (event.key === 'Escape') setConfirmOpen(false) }}>
            <h2 id="confirm-title">Confirmar alterações</h2>
            <p id="confirm-description">Você realmente quer alterar os dados da sua conta? {emailChanged && 'A mudança de email pode exigir confirmação por mensagem.'}</p>
            <div className="settings-edit-actions"><button type="button" className="settings-secondary" onClick={() => setConfirmOpen(false)}>Voltar e revisar</button><button type="button" className="settings-save" autoFocus onClick={() => void saveChanges()}>Sim, salvar alterações</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
