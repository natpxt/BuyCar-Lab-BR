import type { StoredVehicle } from '../application/appState'
import { toggleOptionSelection } from '../application/multiVehicleSelection'

interface OptionMultiSelectProps {
  readonly label: string
  readonly candidates: readonly StoredVehicle[]
  readonly selectedIds: readonly string[]
  readonly error: string | null
  onChange(selectedIds: readonly string[]): void
  onError(message: string | null): void
}

export function OptionMultiSelect({
  label,
  candidates,
  selectedIds,
  error,
  onChange,
  onError,
}: OptionMultiSelectProps) {
  return (
    <fieldset className="option-multiselect">
      <legend>{label}</legend>
      <div className="option-multiselect-list">
        {candidates.map((candidate) => (
          <label key={candidate.id} className="option-multiselect-item">
            <input
              type="checkbox"
              checked={selectedIds.includes(candidate.id)}
              onChange={() => {
                const next = toggleOptionSelection(selectedIds, candidate.id)
                if (next.limitReached) {
                  onError('Você pode comparar até 2 opções de troca.')
                  return
                }
                onError(null)
                onChange(next.selectedIds)
              }}
            />
            <span>{candidate.vehicle.name}</span>
          </label>
        ))}
      </div>
      <small>Selecione uma ou duas opções.</small>
      {error && <span className="option-multiselect-error" role="alert">{error}</span>}
    </fieldset>
  )
}
