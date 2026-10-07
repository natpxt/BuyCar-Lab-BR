import {
  assertValidAppState,
  createInitialAppState,
  type AppState,
} from './appState'

export const APP_STATE_STORAGE_KEY = 'mycar:app-state:v1'
export const APP_STATE_SCHEMA_VERSION = 1

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface PersistedAppState {
  readonly schemaVersion: number
  readonly state: AppState
}

export type PersistenceErrorCode =
  | 'readFailed'
  | 'writeFailed'
  | 'clearFailed'
  | 'corrupted'
  | 'unknownSchema'

export class AppPersistenceError extends Error {
  readonly code: PersistenceErrorCode
  readonly cause: unknown

  constructor(code: PersistenceErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AppPersistenceError'
    this.code = code
    this.cause = cause
  }
}

export interface PersistedStateUpdate {
  readonly state: AppState
  readonly persistenceError: AppPersistenceError | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function loadAppState(storage: StorageAdapter): AppState {
  let serialized: string | null
  try {
    serialized = storage.getItem(APP_STATE_STORAGE_KEY)
  } catch (error) {
    throw new AppPersistenceError(
      'readFailed',
      'não foi possível ler os dados locais',
      error,
    )
  }

  if (serialized === null) {
    return createInitialAppState()
  }

  let persisted: unknown
  try {
    persisted = JSON.parse(serialized)
  } catch (error) {
    throw new AppPersistenceError(
      'corrupted',
      'os dados locais estão corrompidos',
      error,
    )
  }

  if (!isRecord(persisted)) {
    throw new AppPersistenceError(
      'corrupted',
      'o conteúdo dos dados locais é inválido',
    )
  }
  if (persisted.schemaVersion !== APP_STATE_SCHEMA_VERSION) {
    throw new AppPersistenceError(
      'unknownSchema',
      `schema local não suportado: ${String(persisted.schemaVersion)}`,
    )
  }

  try {
    assertValidAppState(persisted.state)
  } catch (error) {
    throw new AppPersistenceError(
      'corrupted',
      'o estado local não corresponde ao schema esperado',
      error,
    )
  }
  return persisted.state
}

export function saveAppState(
  storage: StorageAdapter,
  state: AppState,
): void {
  const persisted: PersistedAppState = {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    state,
  }
  try {
    storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(persisted))
  } catch (error) {
    throw new AppPersistenceError(
      'writeFailed',
      'não foi possível salvar os dados locais',
      error,
    )
  }
}

export function clearAppState(storage: StorageAdapter): void {
  try {
    storage.removeItem(APP_STATE_STORAGE_KEY)
  } catch (error) {
    throw new AppPersistenceError(
      'clearFailed',
      'não foi possível apagar os dados locais',
      error,
    )
  }
}

export function applyPersistedStateUpdate(
  currentState: AppState,
  update: (state: AppState) => AppState,
  storage: StorageAdapter,
): PersistedStateUpdate {
  const nextState = update(currentState)
  try {
    saveAppState(storage, nextState)
    return { state: nextState, persistenceError: null }
  } catch (error) {
    return {
      state: nextState,
      persistenceError: error instanceof AppPersistenceError
        ? error
        : new AppPersistenceError(
            'writeFailed',
            'não foi possível salvar os dados locais',
            error,
          ),
    }
  }
}
