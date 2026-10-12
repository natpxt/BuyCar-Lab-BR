import {
  calculateSelectedVehicleComparison,
  type AppState,
  type IntegratedVehicleComparison,
} from './appState'

export const MAX_COMPARISON_OPTIONS = 2
export const MAX_DASHBOARD_OPTIONS = 4

export interface SelectionChange {
  readonly selectedIds: readonly string[]
  readonly limitReached: boolean
}

export function initializeOptionSelection(
  availableIds: readonly string[],
  persistedId: string | null,
): readonly string[] {
  if (persistedId !== null && availableIds.includes(persistedId)) {
    return [persistedId]
  }
  return availableIds.length > 0 ? [availableIds[0]] : []
}

export function reconcileOptionSelection(
  selectedIds: readonly string[],
  availableIds: readonly string[],
  persistedId: string | null,
  maximumOptions = MAX_COMPARISON_OPTIONS,
): readonly string[] {
  const available = new Set(availableIds)
  const valid = selectedIds.filter((id, index) => (
    available.has(id) && selectedIds.indexOf(id) === index
  )).slice(0, maximumOptions)
  return valid.length > 0
    ? valid
    : initializeOptionSelection(availableIds, persistedId)
}

export function toggleOptionSelection(
  selectedIds: readonly string[],
  optionId: string,
  maximumOptions = MAX_COMPARISON_OPTIONS,
): SelectionChange {
  if (selectedIds.includes(optionId)) {
    return {
      selectedIds: selectedIds.filter((id) => id !== optionId),
      limitReached: false,
    }
  }
  if (selectedIds.length >= maximumOptions) {
    return { selectedIds: [...selectedIds], limitReached: true }
  }
  return {
    selectedIds: [...selectedIds, optionId],
    limitReached: false,
  }
}

export function calculateOptionComparisons(
  state: AppState,
  optionIds: readonly string[],
): readonly IntegratedVehicleComparison[] {
  return optionIds.map((optionId) => calculateSelectedVehicleComparison({
    ...state,
    selectedComparisonCandidateId: optionId,
  }))
}
