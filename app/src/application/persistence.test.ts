import { describe, expect, it } from 'vitest'
import type { Vehicle } from '../domain/vehicle'
import {
  addCandidate,
  createInitialAppState,
  selectComparisonCandidate,
  setCandidateFinancing,
  setCurrentVehicle,
  type CandidateFinancingInput,
} from './appState'
import {
  APP_STATE_SCHEMA_VERSION,
  APP_STATE_STORAGE_KEY,
  AppPersistenceError,
  applyPersistedStateUpdate,
  clearAppState,
  loadAppState,
  saveAppState,
  type StorageAdapter,
} from './persistence'

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>()
  failReads = false
  failWrites = false
  failClears = false

  getItem(key: string): string | null {
    if (this.failReads) {
      throw new Error('falha simulada de leitura')
    }
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new Error('falha simulada de gravação')
    }
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    if (this.failClears) {
      throw new Error('falha simulada de limpeza')
    }
    this.values.delete(key)
  }
}

const vehicle = {
  name: 'Veículo',
  powertrain: 'ICE',
  annualMileageKm: 12_000,
  vehicleValue: 30_000,
  annualDepreciationRate: 0.05,
  annualCosts: {
    insurance: 1_000,
    propertyTax: 500,
    licensing: 100,
    maintenance: 600,
  },
  fuel: {
    description: 'Gasolina',
    consumption: { unit: 'km/L', value: 12 },
    pricePerLiter: 6,
  },
} satisfies Vehicle

const financing = {
  purchase: { price: 50_000, tradeInValue: 10_000 },
  rate: { value: 0.01, periodicity: 'monthly' },
  termMonths: 24,
  strategy: 'reducePayment',
  extraPaymentSchedule: {
    recurring: {
      amount: 250,
      startPeriod: 2,
      frequencyMonths: 2,
    },
  },
  periodicCharges: [{
    description: 'Seguro',
    amount: 50,
    startPeriod: 1,
    frequencyMonths: 1,
  }],
} satisfies CandidateFinancingInput

function createPopulatedState() {
  let state = setCurrentVehicle(
    createInitialAppState(),
    vehicle,
    'current-1',
  )
  state = addCandidate(state, {
    ...vehicle,
    name: 'Candidato',
  }, 'candidate-1')
  state = selectComparisonCandidate(state, 'candidate-1')
  state = setCandidateFinancing(state, 'candidate-1', financing)
  return state
}

describe('persistência local', () => {
  it('retorna estado inicial quando não existem dados', () => {
    const storage = new MemoryStorage()
    expect(loadAppState(storage)).toEqual(createInitialAppState())
  })

  it('faz round-trip de entradas usando chave e schema versionados', () => {
    const storage = new MemoryStorage()
    const state = createPopulatedState()
    saveAppState(storage, state)

    expect(loadAppState(storage)).toEqual(state)
    const serialized = storage.values.get(APP_STATE_STORAGE_KEY)
    expect(serialized).toBeDefined()
    expect(JSON.parse(serialized ?? '{}').schemaVersion).toBe(
      APP_STATE_SCHEMA_VERSION,
    )
    expect(serialized).not.toContain('schedule')
    expect(serialized).not.toContain('totalInterest')
  })

  it('detecta JSON corrompido', () => {
    const storage = new MemoryStorage()
    storage.values.set(APP_STATE_STORAGE_KEY, '{conteúdo inválido')

    expect(() => loadAppState(storage)).toThrowError(
      expect.objectContaining({ code: 'corrupted' }),
    )
  })

  it('detecta conteúdo estruturalmente inválido', () => {
    const storage = new MemoryStorage()
    storage.values.set(APP_STATE_STORAGE_KEY, JSON.stringify({
      schemaVersion: APP_STATE_SCHEMA_VERSION,
      state: { candidates: 'inválido' },
    }))

    expect(() => loadAppState(storage)).toThrowError(
      expect.objectContaining({ code: 'corrupted' }),
    )
  })

  it('rejeita schema desconhecido sem apagar o conteúdo', () => {
    const storage = new MemoryStorage()
    const serialized = JSON.stringify({
      schemaVersion: 999,
      state: createInitialAppState(),
    })
    storage.values.set(APP_STATE_STORAGE_KEY, serialized)

    expect(() => loadAppState(storage)).toThrowError(
      expect.objectContaining({ code: 'unknownSchema' }),
    )
    expect(storage.values.get(APP_STATE_STORAGE_KEY)).toBe(serialized)
  })

  it('limpa explicitamente todos os dados persistidos', () => {
    const storage = new MemoryStorage()
    saveAppState(storage, createPopulatedState())
    clearAppState(storage)

    expect(storage.values.has(APP_STATE_STORAGE_KEY)).toBe(false)
    expect(loadAppState(storage)).toEqual(createInitialAppState())
  })

  it('preserva o novo estado em memória quando a gravação falha', () => {
    const storage = new MemoryStorage()
    storage.failWrites = true
    const initial = createInitialAppState()
    const result = applyPersistedStateUpdate(
      initial,
      (state) => addCandidate(state, vehicle, 'candidate-1'),
      storage,
    )

    expect(initial.candidates).toEqual([])
    expect(result.state.candidates).toHaveLength(1)
    expect(result.state.candidates[0].id).toBe('candidate-1')
    expect(result.persistenceError).toBeInstanceOf(AppPersistenceError)
    expect(result.persistenceError?.code).toBe('writeFailed')
    expect(storage.values.size).toBe(0)
  })

  it('é determinística e não modifica o estado salvo', () => {
    const storage = new MemoryStorage()
    const state = createPopulatedState()
    const before = structuredClone(state)
    saveAppState(storage, state)
    const first = loadAppState(storage)
    const second = loadAppState(storage)

    expect(state).toEqual(before)
    expect(first).toEqual(second)
  })
})
