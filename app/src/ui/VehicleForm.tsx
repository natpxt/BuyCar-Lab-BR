import { useState, type FormEvent } from 'react'
import type { Powertrain, Vehicle } from '../domain/vehicle'
import {
  buildVehicleFromForm,
  createVehicleFormState,
  type VehicleFormState,
} from './vehicleFormModel'

interface VehicleFormProps {
  readonly initialVehicle?: Vehicle
  readonly title: string
  readonly submitLabel: string
  onCancel(): void
  onSubmit(vehicle: Vehicle): void
}

const powertrainLabels: Record<Powertrain, string> = {
  ICE: 'Combustão (ICE)',
  HEV: 'Híbrido convencional (HEV)',
  PHEV: 'Híbrido plug-in (PHEV)',
  BEV: 'Elétrico (BEV)',
}

interface FieldProps {
  readonly label: string
  readonly value: string
  readonly suffix?: string
  readonly placeholder?: string
  onChange(value: string): void
}

function Field({ label, value, suffix, placeholder, onChange }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-with-suffix">
        <input
          value={value}
          placeholder={placeholder}
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  )
}

export function VehicleForm({
  initialVehicle,
  title,
  submitLabel,
  onCancel,
  onSubmit,
}: VehicleFormProps) {
  const [form, setForm] = useState(() => createVehicleFormState(initialVehicle))
  const [error, setError] = useState<string | null>(null)
  const update = <K extends keyof VehicleFormState>(
    field: K,
    value: VehicleFormState[K],
  ) => setForm((current) => ({ ...current, [field]: value }))
  const usesFuel = form.powertrain !== 'BEV'
  const usesElectricity = form.powertrain === 'BEV' || form.powertrain === 'PHEV'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      onSubmit(buildVehicleFromForm(form))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Dados do veículo inválidos')
    }
  }

  return (
    <form className="editor-card" onSubmit={submit}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Cadastro de veículo</span>
          <h2>{title}</h2>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-grid">
        <label className="field field-wide">
          <span>Nome do veículo</span>
          <input
            value={form.name}
            placeholder="Ex.: Meu carro atual"
            onChange={(event) => update('name', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Motorização</span>
          <select
            value={form.powertrain}
            onChange={(event) => update(
              'powertrain',
              event.target.value as Powertrain,
            )}
          >
            {Object.entries(powertrainLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <Field label="Quilometragem anual" suffix="km/ano" value={form.annualMileageKm} onChange={(value) => update('annualMileageKm', value)} />
        <Field label="Valor do veículo" suffix="R$" value={form.vehicleValue} onChange={(value) => update('vehicleValue', value)} />
        <Field label="Depreciação anual" suffix="%" value={form.annualDepreciationPercent} onChange={(value) => update('annualDepreciationPercent', value)} />
      </div>

      <fieldset>
        <legend>Custos anuais</legend>
        <div className="form-grid form-grid-four">
          <Field label="Seguro" suffix="R$" value={form.insurance} onChange={(value) => update('insurance', value)} />
          <Field label="IPVA" suffix="R$" value={form.propertyTax} onChange={(value) => update('propertyTax', value)} />
          <Field label="Licenciamento" suffix="R$" value={form.licensing} onChange={(value) => update('licensing', value)} />
          <Field label="Manutenção" suffix="R$" value={form.maintenance} onChange={(value) => update('maintenance', value)} />
        </div>
      </fieldset>

      {usesFuel && (
        <fieldset>
          <legend>Combustível</legend>
          <div className="form-grid">
            <label className="field">
              <span>Tipo de combustível</span>
              <input value={form.fuelDescription} onChange={(event) => update('fuelDescription', event.target.value)} />
            </label>
            <Field label="Consumo" value={form.fuelConsumptionValue} onChange={(value) => update('fuelConsumptionValue', value)} />
            <label className="field">
              <span>Unidade do consumo</span>
              <select value={form.fuelConsumptionUnit} onChange={(event) => update('fuelConsumptionUnit', event.target.value as VehicleFormState['fuelConsumptionUnit'])}>
                <option value="km/L">km/L</option>
                <option value="L/100km">L/100 km</option>
              </select>
            </label>
            <Field label="Preço do combustível" suffix="R$/L" value={form.pricePerLiter} onChange={(value) => update('pricePerLiter', value)} />
          </div>
        </fieldset>
      )}

      {usesElectricity && (
        <fieldset>
          <legend>Energia elétrica</legend>
          <div className="form-grid">
            <Field label="Consumo elétrico" suffix="kWh/100 km" value={form.consumptionKwhPer100Km} onChange={(value) => update('consumptionKwhPer100Km', value)} />
            <Field label="Preço da energia" suffix="R$/kWh" value={form.pricePerKwh} onChange={(value) => update('pricePerKwh', value)} />
            <Field label="Perdas de carregamento" suffix="%" value={form.chargingLossPercent} onChange={(value) => update('chargingLossPercent', value)} />
          </div>
          {form.powertrain === 'PHEV' && (
            <div className="form-grid">
              <Field label="Uso em modo elétrico" suffix="% da km anual" value={form.electricSharePercent} onChange={(value) => update('electricSharePercent', value)} />
              <Field label="Uso em combustão" suffix="% da km anual" value={form.combustionSharePercent} onChange={(value) => update('combustionSharePercent', value)} />
            </div>
          )}
        </fieldset>
      )}

      <div className="form-actions">
        <button type="button" className="button button-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="button button-primary">{submitLabel}</button>
      </div>
    </form>
  )
}
