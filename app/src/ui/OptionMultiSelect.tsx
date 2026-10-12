import { useId } from 'react'
import { CarFront, ChevronDown } from 'lucide-react'
import { AppIcon } from './AppIcon'
import type { StoredVehicle } from '../application/appState'
import { MAX_DASHBOARD_OPTIONS, toggleOptionSelection } from '../application/multiVehicleSelection'

interface OptionMultiSelectProps {
  readonly label: string
  readonly candidates: readonly StoredVehicle[]
  readonly selectedIds: readonly string[]
  readonly error: string | null
  readonly maximumOptions?: number
  onChange(selectedIds: readonly string[]): void
  onError(message: string | null): void
}

export function OptionMultiSelect({
  label,
  candidates,
  selectedIds,
  error,
  maximumOptions = MAX_DASHBOARD_OPTIONS,
  onChange,
  onError,
}: OptionMultiSelectProps) {
  const helpId = useId()
  const single = maximumOptions === 1
  const visible = candidates.slice(0, candidates.length > 4 ? 3 : 4)
  const remaining = candidates.filter((candidate) => !visible.some((item) => item.id === candidate.id))
  const hiddenSelectionCount = remaining.filter((candidate) => selectedIds.includes(candidate.id)).length
  const renderOption = (candidate: StoredVehicle) => (
    <label key={candidate.id} className="option-multiselect-item">
      <input
        type={single ? 'radio' : 'checkbox'}
        name={single ? helpId : undefined}
        checked={selectedIds.includes(candidate.id)}
        aria-describedby={helpId}
        onChange={() => {
          const next = single
            ? { selectedIds: [candidate.id], limitReached: false }
            : toggleOptionSelection(selectedIds, candidate.id, maximumOptions)
          if (next.limitReached) {
            onError(`Você pode comparar até ${maximumOptions} opções de troca.`)
            return
          }
          onError(null)
          onChange(next.selectedIds)
        }}
      />
      <span>{candidate.vehicle.name}</span>
    </label>
  )
  return (
    <fieldset className="option-multiselect option-selector-strip" aria-labelledby={`${helpId}-title`}>
      <legend className="sr-only">{label}</legend>
      <h2 id={`${helpId}-title`} className="option-selector-title"><AppIcon icon={CarFront} />{label}</h2>
      <div className="option-selector-heading">
        <small id={helpId}>{single ? 'Escolha um veículo para esta simulação' : `Selecione até ${maximumOptions} veículos`}</small>
      </div>
      <div className="option-selector-row">
        {visible.map(renderOption)}
        {remaining.length > 0 && (
          <details className={`option-multiselect-more ${hiddenSelectionCount > 0 ? 'option-multiselect-more-selected' : ''}`}>
            <summary aria-label={`Mais ${remaining.length} veículos${hiddenSelectionCount > 0 ? `, ${hiddenSelectionCount} selecionado${hiddenSelectionCount > 1 ? 's' : ''}` : ''}`}>
              +{remaining.length}<AppIcon icon={ChevronDown} size={16} />
            </summary>
            <div className="option-multiselect-list">{remaining.map(renderOption)}</div>
          </details>
        )}
      </div>
      {error && <span className="option-multiselect-error" role="alert">{error}</span>}
    </fieldset>
  )
}
