import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  createInitialAppState,
  type AppState,
} from './appState'
import {
  AppPersistenceError,
  applyPersistedStateUpdate,
  clearAppState,
  loadAppState,
  type StorageAdapter,
} from './persistence'

export interface AppStateContextValue {
  readonly state: AppState
  readonly persistenceError: AppPersistenceError | null
  updateState(update: (state: AppState) => AppState): void
  clearAllData(): void
}

interface AppStateProviderProps {
  readonly children: ReactNode
  readonly storage?: StorageAdapter
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({
  children,
  storage = window.localStorage,
}: AppStateProviderProps) {
  const [loaded] = useState(() => {
    try {
      return {
        state: loadAppState(storage),
        error: null,
      }
    } catch (error) {
      return {
        state: createInitialAppState(),
        error: error instanceof AppPersistenceError
          ? error
          : new AppPersistenceError(
              'readFailed',
              'não foi possível carregar os dados locais',
              error,
            ),
      }
    }
  })
  const [state, setState] = useState(loaded.state)
  const stateRef = useRef(state)
  const [persistenceError, setPersistenceError] = useState(loaded.error)

  const updateState = useCallback((update: (value: AppState) => AppState) => {
    const result = applyPersistedStateUpdate(stateRef.current, update, storage)
    stateRef.current = result.state
    setState(result.state)
    setPersistenceError(result.persistenceError)
  }, [storage])

  const clearAllData = useCallback(() => {
    try {
      clearAppState(storage)
      const initialState = createInitialAppState()
      stateRef.current = initialState
      setState(initialState)
      setPersistenceError(null)
    } catch (error) {
      setPersistenceError(error instanceof AppPersistenceError
        ? error
        : new AppPersistenceError(
            'clearFailed',
            'não foi possível apagar os dados locais',
            error,
          ))
    }
  }, [storage])

  return (
    <AppStateContext.Provider value={{
      state,
      persistenceError,
      updateState,
      clearAllData,
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
