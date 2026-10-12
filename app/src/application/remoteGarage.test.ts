import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Vehicle } from '../domain/vehicle'
import { createInitialAppState, type AppState } from './appState'
import { loadRemoteGarage, RemoteGarageConflictError, saveRemoteGarage } from './remoteGarage'

const common = {
  annualMileageKm: 18_000,
  vehicleValue: 90_000,
  annualDepreciationRate: 0.04,
  annualCosts: { insurance: 2_000, propertyTax: 3_600, licensing: 175, maintenance: 1_500 },
}

const fuel = {
  description: 'Gasolina',
  consumption: { unit: 'km/L' as const, value: 12 },
  pricePerLiter: 6,
}

const electricity = {
  consumptionKwhPer100Km: 18,
  pricePerKwh: 1.1,
  chargingLossRate: 0.08,
}

const vehicles: readonly Vehicle[] = [
  { ...common, name: 'Atual', powertrain: 'ICE', fuel },
  { ...common, name: 'Híbrido', powertrain: 'HEV', fuel },
  { ...common, name: 'Plug-in', powertrain: 'PHEV', fuel, electricity, electricShare: 0.6, combustionShare: 0.4 },
  { ...common, name: 'Elétrico', powertrain: 'BEV', electricity },
]

function fakeClient() {
  const rows: Record<string, Record<string, unknown>[]> = {
    vehicles: [],
    financing_configs: [],
    garage_settings: [],
  }
  const calls: { table: string; action: string; row?: Record<string, unknown> }[] = []
  const client = {
    from(table: string) {
      return {
        upsert(row: Record<string, unknown>) {
          calls.push({ table, action: 'upsert', row })
          const key = table === 'vehicles' ? 'id' : table === 'financing_configs' ? 'candidate_id' : 'user_id'
          rows[table] = rows[table].filter((item) => item[key] !== row[key]).concat(row)
          return Promise.resolve({ error: null })
        },
        delete() {
          return { eq(_field: string, userId: string) {
            return { in(field: string, ids: string[]) {
              calls.push({ table, action: 'delete' })
              rows[table] = rows[table].filter((row) => row.user_id !== userId || !ids.includes(String(row[field])))
              if (table === 'vehicles') {
                rows.financing_configs = rows.financing_configs.filter((row) => !ids.includes(String(row.candidate_id)))
              }
              return Promise.resolve({ error: null })
            } }
          } }
        },
        select(_columns: string) {
          return { eq(_field: string, userId: string) {
            const selected = rows[table].filter((row) => row.user_id === userId)
            const result = { data: selected, error: null }
            return {
              order: async () => ({ data: [...selected].sort((a, b) => Number(a.sort_order) - Number(b.sort_order)), error: null }),
              maybeSingle: async () => ({ data: selected[0] ?? null, error: null }),
              then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
            }
          } }
        },
      }
    },
  } as unknown as SupabaseClient
  return { client, rows, calls }
}

describe('garagem remota', () => {
  it('preserva todos os campos de ICE, HEV, PHEV e BEV no ciclo de gravação e leitura', async () => {
    const { client, rows } = fakeClient()
    const state: AppState = {
      currentVehicle: { id: 'current', vehicle: vehicles[0] },
      candidates: vehicles.slice(1).map((vehicle, index) => ({ id: `candidate-${index}`, vehicle })),
      selectedComparisonCandidateId: 'candidate-1',
      selectedFinancingCandidateId: 'candidate-2',
      financingByCandidateId: {
        'candidate-2': {
          purchase: { price: 100_000, tradeInValue: 30_000 },
          rate: { value: 0.01, periodicity: 'monthly' },
          termMonths: 48,
          strategy: 'reduceTerm',
          extraPaymentSchedule: { oneTime: [{ amount: 1_000, period: 3 }] },
        },
      },
    }

    await saveRemoteGarage(client, 'user-1', createInitialAppState(), state)
    expect(rows.vehicles).toHaveLength(4)
    expect(rows.vehicles.find((row) => row.id === 'candidate-1')?.vehicle_data).toEqual(vehicles[2])
    expect(await loadRemoteGarage(client, 'user-1')).toEqual(state)
  })

  it('remove a configuração da opção excluída e não regrava veículos intactos', async () => {
    const { client, calls } = fakeClient()
    const first: AppState = {
      ...createInitialAppState(),
      currentVehicle: { id: 'current', vehicle: vehicles[0] },
      candidates: [{ id: 'candidate', vehicle: vehicles[3] }],
      financingByCandidateId: {
        candidate: {
          purchase: { price: 100_000 },
          rate: { value: 0.01, periodicity: 'monthly' },
          termMonths: 48,
          strategy: 'none',
        },
      },
    }
    await saveRemoteGarage(client, 'user-1', createInitialAppState(), first)
    calls.length = 0
    const second: AppState = { ...first, candidates: [], financingByCandidateId: {} }
    await saveRemoteGarage(client, 'user-1', first, second)
    expect(calls.filter((call) => call.table === 'vehicles' && call.action === 'upsert')).toHaveLength(0)
    expect(await loadRemoteGarage(client, 'user-1')).toEqual(second)
  })

  it('não sobrescreve alterações remotas feitas depois do carregamento', async () => {
    const { client, rows } = fakeClient()
    const empty = createInitialAppState()
    const first = { ...empty, currentVehicle: { id: 'current', vehicle: vehicles[0] } }
    await saveRemoteGarage(client, 'user-1', empty, first)
    const changed = { ...first, currentVehicle: { id: 'current', vehicle: vehicles[1] } }
    await saveRemoteGarage(client, 'user-1', first, changed)
    await expect(saveRemoteGarage(client, 'user-1', first, empty))
      .rejects.toBeInstanceOf(RemoteGarageConflictError)
    expect(rows.vehicles[0].vehicle_data).toEqual(vehicles[1])
  })
})
