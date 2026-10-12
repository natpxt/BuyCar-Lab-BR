import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthProvider'
import { createInitialAppState, type AppState } from './appState'
import {
  AppPersistenceError,
  applyPersistedStateUpdate,
  clearAppState,
  loadAppState,
  type StorageAdapter,
} from './persistence'
import { ensureProfile, isEmptyGarage, loadRemoteGarage, RemoteGarageConflictError, saveRemoteGarage } from './remoteGarage'
import { supabase } from './supabaseClient'

export interface AppStateContextValue {
  readonly state: AppState
  readonly persistenceError: AppPersistenceError | null
  readonly storageMode: 'guest' | 'cloud'
  readonly hasLocalGarage: boolean
  readonly syncing: boolean
  updateState(update: (state: AppState) => AppState): void
  clearAllData(): void
  flushPending(): Promise<void>
  retrySave(): void
  importLocalGarage(): Promise<boolean>
}

interface AppStateProviderProps {
  readonly children: ReactNode
  readonly storage?: StorageAdapter
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

function readGuestState(storage: StorageAdapter) {
  try {
    return { state: loadAppState(storage), error: null }
  } catch (error) {
    return {
      state: createInitialAppState(),
      error: error instanceof AppPersistenceError
        ? error
        : new AppPersistenceError('readFailed', 'não foi possível carregar os dados locais', error),
    }
  }
}

function remoteError(error: unknown, action: 'read' | 'write'): AppPersistenceError {
  return new AppPersistenceError(
    action === 'read' ? 'readFailed' : 'writeFailed',
    error instanceof RemoteGarageConflictError
      ? error.message
      : action === 'read'
      ? 'não foi possível carregar sua garagem da conta'
      : 'não foi possível sincronizar sua garagem; tente novamente antes de sair',
    error,
  )
}

export function AppStateProvider({
  children,
  storage = window.localStorage,
}: AppStateProviderProps) {
  const { user, loading: authLoading } = useAuth()
  const [initial] = useState(() => readGuestState(storage))
  const [state, setState] = useState(initial.state)
  const stateRef = useRef(state)
  const [persistenceError, setPersistenceError] = useState(initial.error)
  const [hasLocalGarage, setHasLocalGarage] = useState(!isEmptyGarage(initial.state))
  const [syncing, setSyncing] = useState(false)
  const [mode, setMode] = useState<'guest' | 'cloud' | 'loading' | 'error'>(
    authLoading ? 'loading' : 'guest',
  )
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const lastSavedRef = useRef<AppState>(createInitialAppState())
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const generationRef = useRef(0)
  const pendingRef = useRef(0)
  const saveFailureRef = useRef<unknown>(null)

  useEffect(() => {
    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      if (pendingRef.current === 0) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeClose)
    return () => window.removeEventListener('beforeunload', warnBeforeClose)
  }, [])

  useEffect(() => {
    if (authLoading) {
      setMode('loading')
      return
    }
    const generation = ++generationRef.current
    saveFailureRef.current = null
    if (!user || !supabase) {
      const guest = readGuestState(storage)
      stateRef.current = guest.state
      setState(guest.state)
      setHasLocalGarage(!isEmptyGarage(guest.state))
      setPersistenceError(guest.error)
      setLoadedUserId(null)
      setMode('guest')
      return
    }

    let active = true
    setMode('loading')
    setPersistenceError(null)
    const client = supabase

    async function loadAccount() {
      try {
        const displayName = typeof user!.user_metadata.display_name === 'string'
          ? user!.user_metadata.display_name
          : user!.email?.split('@')[0] ?? 'Usuário'
        await ensureProfile(client, user!.id, displayName)
        const remote = await loadRemoteGarage(client, user!.id)
        if (!active || generation !== generationRef.current) return

        let selected = remote
        const guest = readGuestState(storage)
        const choiceKey = `mycar:import-choice:${user!.id}`
        let alreadyChosen = false
        try { alreadyChosen = storage.getItem(choiceKey) !== null } catch { /* sem preferência local */ }
        setHasLocalGarage(!guest.error && !isEmptyGarage(guest.state))
        if (!alreadyChosen && !guest.error && !isEmptyGarage(guest.state)) {
          const message = isEmptyGarage(remote)
            ? 'Há uma garagem salva neste navegador. Deseja importá-la para sua conta? A cópia local será preservada.'
            : 'Há dados neste navegador e na sua conta. Importar substituirá a garagem da conta pela cópia local. Deseja continuar? A cópia local será preservada.'
          if (window.confirm(message)) {
            await saveRemoteGarage(client, user!.id, remote, guest.state)
            selected = guest.state
          }
          try { storage.setItem(choiceKey, 'reviewed') } catch { /* importação já concluída */ }
        }
        if (!active || generation !== generationRef.current) return
        lastSavedRef.current = selected
        stateRef.current = selected
        setState(selected)
        setLoadedUserId(user!.id)
        setMode('cloud')
      } catch (error) {
        if (!active || generation !== generationRef.current) return
        setPersistenceError(remoteError(error, 'read'))
        setMode('error')
      }
    }
    void loadAccount()
    return () => { active = false }
  }, [user?.id, authLoading, storage, loadAttempt])

  const queueRemoteSave = useCallback((next: AppState) => {
    if (!user || !supabase) return
    const userId = user.id
    const generation = generationRef.current
    const client = supabase
    pendingRef.current += 1
    setSyncing(true)
    const task = saveQueueRef.current.catch(() => undefined).then(async () => {
      if (generation !== generationRef.current) return
      if (saveFailureRef.current) throw saveFailureRef.current
      try {
        await saveRemoteGarage(client, userId, lastSavedRef.current, next)
      } catch (error) {
        saveFailureRef.current = error
        throw error
      }
      if (generation !== generationRef.current) return
      lastSavedRef.current = next
      setPersistenceError(null)
    })
    saveQueueRef.current = task
    void task.finally(() => {
      pendingRef.current -= 1
      setSyncing(pendingRef.current > 0)
    }).catch(() => undefined)
    void task.catch((error) => {
      if (generation === generationRef.current) {
        setPersistenceError(remoteError(error, 'write'))
      }
    })
  }, [user?.id])

  const updateState = useCallback((update: (value: AppState) => AppState) => {
    if (mode === 'cloud') {
      const next = update(stateRef.current)
      stateRef.current = next
      setState(next)
      queueRemoteSave(next)
      return
    }
    if (mode !== 'guest') return
    const result = applyPersistedStateUpdate(stateRef.current, update, storage)
    stateRef.current = result.state
    setState(result.state)
    setHasLocalGarage(!isEmptyGarage(result.state))
    setPersistenceError(result.persistenceError)
  }, [mode, queueRemoteSave, storage])

  const clearAllData = useCallback(() => {
    if (mode === 'cloud') {
      updateState(() => createInitialAppState())
      return
    }
    try {
      clearAppState(storage)
      const empty = createInitialAppState()
      stateRef.current = empty
      setState(empty)
      setHasLocalGarage(false)
      setPersistenceError(null)
    } catch (error) {
      setPersistenceError(error instanceof AppPersistenceError
        ? error
        : new AppPersistenceError('clearFailed', 'não foi possível apagar os dados locais', error))
    }
  }, [mode, storage, updateState])

  const retrySave = useCallback(() => {
    if (mode === 'error') {
      setLoadAttempt((value) => value + 1)
      return
    }
    if (mode !== 'cloud' || !user || !supabase) return
    void (async () => {
      try {
        await saveQueueRef.current.catch(() => undefined)
        const remote = await loadRemoteGarage(supabase, user.id)
        if (JSON.stringify(remote) !== JSON.stringify(lastSavedRef.current)) {
          const confirmed = window.confirm(
            'A garagem da conta mudou desde que esta página foi aberta. Substituir a versão da conta pelos dados desta sessão? Esta ação pode descartar alterações feitas em outro dispositivo.',
          )
          if (!confirmed) return
        }
        lastSavedRef.current = remote
        saveFailureRef.current = null
        queueRemoteSave(stateRef.current)
      } catch (error) {
        setPersistenceError(remoteError(error, 'read'))
      }
    })()
  }, [mode, queueRemoteSave, user?.id])

  const importLocalGarage = useCallback(async () => {
    if (mode !== 'cloud' || !user || !supabase) return false
    const guest = readGuestState(storage)
    if (guest.error) throw guest.error
    if (isEmptyGarage(guest.state)) throw new Error('Não há garagem local para importar.')
    await saveQueueRef.current
    if (!isEmptyGarage(lastSavedRef.current)
      && !window.confirm('Importar substituirá a garagem da conta pelos dados deste navegador. Deseja continuar?')) return false
    await saveRemoteGarage(supabase, user.id, lastSavedRef.current, guest.state)
    lastSavedRef.current = guest.state
    stateRef.current = guest.state
    setState(guest.state)
    setPersistenceError(null)
    try { storage.setItem(`mycar:import-choice:${user.id}`, 'reviewed') } catch { /* opcional */ }
    return true
  }, [mode, user?.id, storage])

  if (mode === 'loading' || mode === 'error' || (mode === 'cloud' && loadedUserId !== user?.id)) {
    return (
      <div className="app-loading">
        <p>{mode === 'error' ? persistenceError?.message : 'Carregando sua garagem…'}</p>
        {mode === 'error' && <button type="button" onClick={retrySave}>Tentar novamente</button>}
      </div>
    )
  }

  return (
    <AppStateContext.Provider value={{
      state,
      persistenceError,
      storageMode: mode,
      hasLocalGarage,
      syncing,
      updateState,
      clearAllData,
      flushPending: async () => { await saveQueueRef.current },
      retrySave,
      importLocalGarage,
    }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext)
  if (context === null) {
    throw new Error('useAppState deve ser usado dentro de AppStateProvider')
  }
  return context
}
