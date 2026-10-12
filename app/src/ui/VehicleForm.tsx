import { useState, type FormEvent } from 'react'
import type { Powertrain, Vehicle } from '../domain/vehicle'
import {
  applyCurrentMileage,
  buildVehicleFromForm,
  initializeVehicleForm,
  setLicensingAutomatic,
  setPropertyTaxAutomatic,
  updateVehicleValue,
  type VehicleFormState,
} from './vehicleFormModel'
import { CurrencyInput } from './CurrencyInput'
import { ArrowLeft, CarFront, Fuel, Route, Save, Wallet, Zap } from 'lucide-react'
import { AppIcon } from './AppIcon'
import { SectionHeader } from './SectionHeader'
import { CheckboxOption } from './CheckboxOption'

interface VehicleFormProps {
  readonly initialVehicle?: Vehicle
  readonly currentMileageKm?: number
  readonly allowCurrentMileage?: boolean
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
  currentMileageKm,
  allowCurrentMileage = false,
  title,
  submitLabel,
  onCancel,
  onSubmit,
}: VehicleFormProps) {
  const initialization = initializeVehicleForm(
    initialVehicle,
    currentMileageKm,
    allowCurrentMileage,
  )
  const [form, setForm] = useState(() => initialization.form)
  const [useCurrentMileage, setUseCurrentMileage] = useState(
    initialization.useCurrentMileage,
  )
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
    <form className="vehicle-editor vehicle-form-workbench" onSubmit={submit}>
      <header className="vehicle-editor-header">
        <div>
          <h2>{title}</h2>
        </div>
        <button type="button" className="button button-ghost" onClick={onCancel}>
          <AppIcon icon={ArrowLeft} size={16} />Voltar para a garagem
        </button>
      </header>

      {error && (
        <div className="alert alert-error vehicle-form-error" role="alert">
          <strong>Revise os dados do veículo.</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="vehicle-form-layout">
        <div className="vehicle-form-main">
          <section className="vehicle-form-panel vehicle-identification-panel">
            <SectionHeader
              icon={CarFront}
              title="Identificação"
            />
            <div className="form-grid">
              <label className="field field-wide">
                <span>Nome do veículo</span>
                <input
                  value={form.name}
                  placeholder="Ex.: Dolphin Mini"
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
            </div>
          </section>

          <section className="vehicle-form-panel vehicle-usage-panel">
            <SectionHeader
              icon={Route}
              title="Uso e valor"
            />
            <div className="vehicle-usage-grid">
              <div className={`field mileage-field ${useCurrentMileage ? 'field-inherited' : ''}`}>
                <span id="annual-mileage-label">Quilometragem anual</span>
                <div className="input-with-suffix">
                  <input
                    value={form.annualMileageKm}
                    inputMode="decimal"
                    aria-labelledby="annual-mileage-label"
                    readOnly={useCurrentMileage}
                    aria-readonly={useCurrentMileage}
                    onChange={(event) => update('annualMileageKm', event.target.value)}
                  />
                  <small>km/ano</small>
                </div>
                {allowCurrentMileage && currentMileageKm !== undefined && (
                  <CheckboxOption
                    title="Usar quilometragem do veículo atual"
                    checked={useCurrentMileage}
                    onChange={(checked) => {
                        setUseCurrentMileage(checked)
                        if (checked) {
                          setForm((current) => applyCurrentMileage(
                            current,
                            currentMileageKm,
                          ))
                        }
                    }}
                  />
                )}
              </div>
              <CurrencyInput
                label="Valor do veículo"
                value={form.vehicleValue}
                onChange={(value) => setForm((current) => updateVehicleValue(current, value))}
              />
              <Field
                label="Depreciação anual"
                suffix="%"
                value={form.annualDepreciationPercent}
                onChange={(value) => update('annualDepreciationPercent', value)}
              />
            </div>
          </section>

          <section className="vehicle-form-panel vehicle-costs-panel">
            <SectionHeader
              icon={Wallet}
              title="Custos anuais"
            />
            <div className="vehicle-annual-cost-grid">
              <div className="vehicle-cost-input-card">
                <CurrencyInput label="Seguro anual" value={form.insurance} onChange={(value) => update('insurance', value)} />
              </div>
              <div className={`vehicle-cost-input-card ${form.propertyTaxAutomatic ? 'vehicle-cost-automatic' : ''}`}>
                <CurrencyInput label="IPVA anual" value={form.propertyTax} onChange={(value) => setForm((current) => ({ ...current, propertyTax: value, propertyTaxAutomatic: false }))} />
                <CheckboxOption title="Usar estimativa automática de SP" checked={form.propertyTaxAutomatic} onChange={(checked) => setForm((current) => setPropertyTaxAutomatic(current, checked))} />
              </div>
              <div className={`vehicle-cost-input-card ${form.licensingAutomatic ? 'vehicle-cost-automatic' : ''}`}>
                <CurrencyInput label="Licenciamento SP — 2026" value={form.licensing} onChange={(value) => setForm((current) => ({ ...current, licensing: value, licensingAutomatic: false }))} />
                <CheckboxOption title="Usar padrão de 2026" checked={form.licensingAutomatic} onChange={(checked) => setForm((current) => setLicensingAutomatic(current, checked))} />
              </div>
              <div className="vehicle-cost-input-card">
                <CurrencyInput label="Manutenção anual" value={form.maintenance} onChange={(value) => update('maintenance', value)} />
              </div>
            </div>
          </section>

          <section className="vehicle-form-panel vehicle-energy-panel">
            <SectionHeader
              icon={usesElectricity ? Zap : Fuel}
              title="Motorização e energia"
            />

            {usesFuel && (
              <div className="energy-source-card">
                <div className="energy-source-heading">
                  <span className="tag"><AppIcon icon={Fuel} />Combustível</span>
                </div>
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
                  <CurrencyInput label="Preço do combustível" suffix="/L" value={form.pricePerLiter} onChange={(value) => update('pricePerLiter', value)} />
                </div>
              </div>
            )}

            {usesElectricity && (
              <div className="energy-source-card energy-source-electric">
                <div className="energy-source-heading">
                  <span className="tag"><AppIcon icon={Zap} />Energia elétrica</span>
                </div>
                <div className="form-grid">
                  <Field label="Consumo elétrico" suffix="kWh/100 km" value={form.consumptionKwhPer100Km} onChange={(value) => update('consumptionKwhPer100Km', value)} />
                  <CurrencyInput label="Preço da energia" suffix="/kWh" value={form.pricePerKwh} onChange={(value) => update('pricePerKwh', value)} />
                  <Field label="Perdas de carregamento" suffix="%" value={form.chargingLossPercent} onChange={(value) => update('chargingLossPercent', value)} />
                </div>
                {form.powertrain === 'PHEV' && (
                  <div className="phev-share-panel">
                    <span>Divisão da quilometragem anual</span>
                    <div className="form-grid">
                      <Field label="Uso em modo elétrico" suffix="%" value={form.electricSharePercent} onChange={(value) => update('electricSharePercent', value)} />
                      <Field label="Uso em combustão" suffix="%" value={form.combustionSharePercent} onChange={(value) => update('combustionSharePercent', value)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

      </div>

      <footer className="vehicle-form-actions">
        <button type="button" className="button button-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="button button-primary"><AppIcon icon={Save} size={16} />{submitLabel}</button>
      </footer>
    </form>
  )
}
