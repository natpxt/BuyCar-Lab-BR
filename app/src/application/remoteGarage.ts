import type { SupabaseClient } from '@supabase/supabase-js'
import { assertValidAppState, createInitialAppState, type AppState } from './appState'
import type { Vehicle } from '../domain/vehicle'

interface VehicleRow {
  readonly id: string
  readonly vehicle_role: 'current' | 'candidate'
  readonly sort_order: number
  readonly vehicle_data: Vehicle
}

interface FinancingRow {
  readonly candidate_id: string
  readonly financing_input: AppState['financingByCandidateId'][string]
}

interface SettingsRow {
  readonly selected_comparison_candidate_id: string | null
  readonly selected_financing_candidate_id: string | null
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export class RemoteGarageConflictError extends Error {
  constructor() {
    super('A garagem foi alterada em outro dispositivo. Revise antes de substituir esses dados.')
    this.name = 'RemoteGarageConflictError'
  }
}

export function isEmptyGarage(state: AppState): boolean {
  return state.currentVehicle === null
    && state.candidates.length === 0
    && Object.keys(state.financingByCandidateId).length === 0
}

export async function ensureProfile(
  client: SupabaseClient,
  userId: string,
  displayName: string,
): Promise<void> {
  const name = displayName.trim() || 'Usuário'
  const inserted = await client.from('profiles').upsert({
    user_id: userId,
    display_name: name,
  }, { onConflict: 'user_id', ignoreDuplicates: true })
  throwIfError(inserted.error)
}

export async function loadRemoteGarage(
  client: SupabaseClient,
  userId: string,
): Promise<AppState> {
  const [vehiclesResult, financingResult, settingsResult] = await Promise.all([
    client.from('vehicles').select('id, vehicle_role, sort_order, vehicle_data')
      .eq('user_id', userId).order('sort_order'),
    client.from('financing_configs').select('candidate_id, financing_input')
      .eq('user_id', userId),
    client.from('garage_settings')
      .select('selected_comparison_candidate_id, selected_financing_candidate_id')
      .eq('user_id', userId).maybeSingle(),
  ])
  throwIfError(vehiclesResult.error)
  throwIfError(financingResult.error)
  throwIfError(settingsResult.error)

  const rows = (vehiclesResult.data ?? []) as VehicleRow[]
  const financingRows = (financingResult.data ?? []) as FinancingRow[]
  const settings = settingsResult.data as SettingsRow | null
  const financingByCandidateId = Object.fromEntries(
    financingRows.map((row) => [row.candidate_id, row.financing_input]),
  )
  const current = rows.find((row) => row.vehicle_role === 'current')
  const state: AppState = {
    currentVehicle: current ? { id: current.id, vehicle: current.vehicle_data } : null,
    candidates: rows.filter((row) => row.vehicle_role === 'candidate')
      .map((row) => ({ id: row.id, vehicle: row.vehicle_data })),
    selectedComparisonCandidateId: settings?.selected_comparison_candidate_id ?? null,
    selectedFinancingCandidateId: settings?.selected_financing_candidate_id ?? null,
    financingByCandidateId,
  }
  assertValidAppState(state)
  return state
}

export async function saveRemoteGarage(
  client: SupabaseClient,
  userId: string,
  previous: AppState,
  next: AppState,
): Promise<void> {
  assertValidAppState(next)
  const current = await loadRemoteGarage(client, userId)
  if (JSON.stringify(current) !== JSON.stringify(previous)) {
    throw new RemoteGarageConflictError()
  }
  const previousVehicles = [
    ...(previous.currentVehicle ? [previous.currentVehicle] : []),
    ...previous.candidates,
  ]
  const nextVehicles = [
    ...(next.currentVehicle ? [next.currentVehicle] : []),
    ...next.candidates,
  ]
  const nextIds = new Set(nextVehicles.map((record) => record.id))
  const removedIds = previousVehicles
    .filter((record) => !nextIds.has(record.id))
    .map((record) => record.id)
  const previousVehicleById = new Map(previousVehicles.map((record) => [record.id, record]))
  const previousOrderById = new Map(previous.candidates.map((record, index) => [record.id, index]))

  if (removedIds.length > 0) {
    const result = await client.from('vehicles').delete()
      .eq('user_id', userId).in('id', removedIds)
    throwIfError(result.error)
  }

  for (const [index, record] of nextVehicles.entries()) {
    const isCurrent = next.currentVehicle?.id === record.id
    const nextOrder = isCurrent ? 0 : index - (next.currentVehicle ? 1 : 0)
    const old = previousVehicleById.get(record.id)
    if (old
      && JSON.stringify(old.vehicle) === JSON.stringify(record.vehicle)
      && (previous.currentVehicle?.id === record.id) === isCurrent
      && (isCurrent || previousOrderById.get(record.id) === nextOrder)
    ) continue
    const result = await client.from('vehicles').upsert({
      id: record.id,
      user_id: userId,
      vehicle_role: isCurrent ? 'current' : 'candidate',
      sort_order: nextOrder,
      vehicle_data: record.vehicle,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    throwIfError(result.error)
  }

  const removedFinancingIds = Object.keys(previous.financingByCandidateId)
    .filter((id) => !(id in next.financingByCandidateId))
  if (removedFinancingIds.length > 0) {
    const result = await client.from('financing_configs').delete()
      .eq('user_id', userId).in('candidate_id', removedFinancingIds)
    throwIfError(result.error)
  }
  for (const [candidateId, input] of Object.entries(next.financingByCandidateId)) {
    if (JSON.stringify(previous.financingByCandidateId[candidateId]) === JSON.stringify(input)) continue
    const result = await client.from('financing_configs').upsert({
      candidate_id: candidateId,
      user_id: userId,
      financing_input: input,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'candidate_id' })
    throwIfError(result.error)
  }

  if (
    previous.selectedComparisonCandidateId !== next.selectedComparisonCandidateId
    || previous.selectedFinancingCandidateId !== next.selectedFinancingCandidateId
  ) {
    const settingsResult = await client.from('garage_settings').upsert({
      user_id: userId,
      selected_comparison_candidate_id: next.selectedComparisonCandidateId,
      selected_financing_candidate_id: next.selectedFinancingCandidateId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    throwIfError(settingsResult.error)
  }
}

export const emptyRemoteGarage = createInitialAppState
