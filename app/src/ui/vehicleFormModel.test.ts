import { describe, expect, it } from 'vitest'
import {
  applyCurrentMileage,
  buildVehicleFromForm,
  createVehicleFormState,
  initializeVehicleForm,
  setLicensingAutomatic,
  setPropertyTaxAutomatic,
  SP_LICENSE_FEE_2026,
  updateVehicleValue,
} from './vehicleFormModel'

const base = {
  ...createVehicleFormState(),
  name: 'Teste',
  annualMileageKm: '12.000',
  vehicleValue: '50.000',
  annualDepreciationPercent: '5',
  insurance: '1.000',
  propertyTax: '500',
  licensing: '150',
  maintenance: '800',
  fuelDescription: 'Gasolina',
  fuelConsumptionValue: '12,5',
  pricePerLiter: '6',
  consumptionKwhPer100Km: '18',
  pricePerKwh: '0,9',
  chargingLossPercent: '10',
}

describe('formulário de veículo', () => {
  it('aceita ICE válido sem nenhum dado elétrico', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      name: 'Nissan Tiida',
      powertrain: 'ICE',
      consumptionKwhPer100Km: '',
      pricePerKwh: '',
      chargingLossPercent: '',
    })
    expect(vehicle.powertrain).toBe('ICE')
    expect(vehicle.annualMileageKm).toBe(12_000)
    expect(vehicle.annualDepreciationRate).toBe(0.05)
    if (vehicle.powertrain === 'ICE') {
      expect(vehicle.fuel.consumption.value).toBe(12.5)
    }
    expect('electricity' in vehicle).toBe(false)
  })

  it('rejeita ICE sem consumo de combustível', () => {
    expect(() => buildVehicleFromForm({
      ...base,
      powertrain: 'ICE',
      fuelConsumptionValue: '',
      consumptionKwhPer100Km: '',
      pricePerKwh: '',
      chargingLossPercent: '',
    })).toThrow('Consumo é obrigatório')
  })

  it('aceita HEV válido sem campos elétricos', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      powertrain: 'HEV',
      consumptionKwhPer100Km: '',
      pricePerKwh: '',
      chargingLossPercent: '',
    })

    expect(vehicle.powertrain).toBe('HEV')
    expect('fuel' in vehicle).toBe(true)
    expect('electricity' in vehicle).toBe(false)
  })

  it('aceita BEV válido sem dados de combustível', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      powertrain: 'BEV',
      fuelDescription: '',
      fuelConsumptionValue: '',
      pricePerLiter: '',
    })

    expect(vehicle.powertrain).toBe('BEV')
    expect('fuel' in vehicle).toBe(false)
    expect('electricity' in vehicle).toBe(true)
  })

  it('rejeita BEV sem consumo elétrico', () => {
    expect(() => buildVehicleFromForm({
      ...base,
      powertrain: 'BEV',
      fuelDescription: '',
      fuelConsumptionValue: '',
      pricePerLiter: '',
      consumptionKwhPer100Km: '',
    })).toThrow('Consumo elétrico é obrigatório')
  })

  it('exige dados energéticos dos dois modos no PHEV', () => {
    expect(() => buildVehicleFromForm({
      ...base,
      powertrain: 'PHEV',
      fuelConsumptionValue: '',
    })).toThrow('Consumo é obrigatório')
    expect(() => buildVehicleFromForm({
      ...base,
      powertrain: 'PHEV',
      consumptionKwhPer100Km: '',
    })).toThrow('Consumo elétrico é obrigatório')
  })

  it('constrói PHEV com divisão de uso totalizando 100%', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      powertrain: 'PHEV',
      electricSharePercent: '70',
      combustionSharePercent: '30',
    })
    expect(vehicle.powertrain).toBe('PHEV')
    if (vehicle.powertrain === 'PHEV') {
      expect(vehicle.electricShare).toBe(0.7)
      expect(vehicle.combustionShare).toBe(0.3)
      expect(vehicle.electricity.chargingLossRate).toBe(0.1)
    }
  })

  it('ignora valores elétricos ocultos ao mudar de BEV para ICE', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      powertrain: 'ICE',
      consumptionKwhPer100Km: 'valor inválido preservado',
      pricePerKwh: '',
      chargingLossPercent: '',
    })

    expect(vehicle.powertrain).toBe('ICE')
    expect('electricity' in vehicle).toBe(false)
  })

  it('ignora valores de combustível ocultos ao mudar de ICE para BEV', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      powertrain: 'BEV',
      fuelDescription: '',
      fuelConsumptionValue: 'valor inválido preservado',
      pricePerLiter: '',
    })

    expect(vehicle.powertrain).toBe('BEV')
    expect('fuel' in vehicle).toBe(false)
  })

  it('inclui somente propriedades energéticas pertinentes ao powertrain', () => {
    const ice = buildVehicleFromForm({ ...base, powertrain: 'ICE' })
    const bev = buildVehicleFromForm({ ...base, powertrain: 'BEV' })
    const phev = buildVehicleFromForm({
      ...base,
      powertrain: 'PHEV',
      electricSharePercent: '60',
      combustionSharePercent: '40',
    })

    expect(Object.keys(ice)).toContain('fuel')
    expect(Object.keys(ice)).not.toContain('electricity')
    expect(Object.keys(bev)).toContain('electricity')
    expect(Object.keys(bev)).not.toContain('fuel')
    expect(Object.keys(phev)).toEqual(expect.arrayContaining([
      'fuel',
      'electricity',
      'electricShare',
      'combustionShare',
    ]))
  })

  it('recria estado editável a partir de veículo do domínio', () => {
    const vehicle = buildVehicleFromForm({ ...base, powertrain: 'BEV' })
    const form = createVehicleFormState(vehicle)
    expect(form.annualDepreciationPercent).toBe('5')
    expect(form.chargingLossPercent).toBe('10')
  })

  it('calcula IPVA padrão de R$ 4.000 para veículo novo de R$ 100.000', () => {
    const form = updateVehicleValue(createVehicleFormState(), '100.000')
    expect(form.propertyTax).toBe('4000')
    expect(form.propertyTaxAutomatic).toBe(true)
  })

  it('atualiza o IPVA quando o valor muda no modo automático', () => {
    const initial = updateVehicleValue(createVehicleFormState(), '100.000')
    const updated = updateVehicleValue(initial, '120.000')
    expect(updated.propertyTax).toBe('4800')
  })

  it('não sobrescreve IPVA após edição manual', () => {
    const automatic = updateVehicleValue(createVehicleFormState(), '100.000')
    const manual = {
      ...automatic,
      propertyTax: '3.000',
      propertyTaxAutomatic: false,
    }
    expect(updateVehicleValue(manual, '120.000').propertyTax).toBe('3.000')
  })

  it('preserva IPVA manual de veículo existente', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      powertrain: 'ICE',
      propertyTax: '500',
    })
    const form = createVehicleFormState(vehicle)
    expect(form.propertyTax).toBe('500')
    expect(form.propertyTaxAutomatic).toBe(false)
  })

  it('preenche o licenciamento padrão de SP 2026 em veículo novo', () => {
    const form = createVehicleFormState()
    expect(form.licensing).toBe(String(SP_LICENSE_FEE_2026).replace('.', ','))
    expect(form.licensingAutomatic).toBe(true)
  })

  it('permite editar o licenciamento manualmente', () => {
    const form = {
      ...createVehicleFormState(),
      ...base,
      licensing: '200',
      licensingAutomatic: false,
    }
    expect(buildVehicleFromForm(form).annualCosts.licensing).toBe(200)
  })

  it('preserva licenciamento salvo de veículo existente', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      powertrain: 'ICE',
      licensing: '222',
    })
    const form = createVehicleFormState(vehicle)
    expect(form.licensing).toBe('222')
    expect(form.licensingAutomatic).toBe(false)
  })

  it('não substitui silenciosamente custos salvos da v0.8', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      powertrain: 'ICE',
      propertyTax: '1.234,56',
      licensing: '199,9',
    })
    const reopened = createVehicleFormState(vehicle)
    expect(reopened.propertyTax).toBe('1234,56')
    expect(reopened.licensing).toBe('199,9')
    expect(reopened.propertyTaxAutomatic).toBe(false)
    expect(reopened.licensingAutomatic).toBe(false)
  })

  it('restaura defaults ao reativar os modos automáticos', () => {
    const manual = {
      ...createVehicleFormState(),
      vehicleValue: '100.000',
      propertyTax: '1.000',
      propertyTaxAutomatic: false,
      licensing: '200',
      licensingAutomatic: false,
    }
    const withTax = setPropertyTaxAutomatic(manual, true)
    const withDefaults = setLicensingAutomatic(withTax, true)
    expect(withDefaults.propertyTax).toBe('4000')
    expect(withDefaults.licensing).toBe('174,08')
  })

  it('inicializa nova opção com a quilometragem do veículo atual', () => {
    const initialized = initializeVehicleForm(undefined, 19_671, true)
    expect(initialized.useCurrentMileage).toBe(true)
    expect(initialized.form.annualMileageKm).toBe('19671')
  })

  it('permite manter uma quilometragem diferente ao desmarcar a cópia', () => {
    const initialized = initializeVehicleForm(undefined, 19_671, true)
    const edited = { ...base, annualMileageKm: '12.000' }
    expect(initialized.useCurrentMileage).toBe(true)
    expect(buildVehicleFromForm(edited).annualMileageKm).toBe(12_000)
  })

  it('preserva quilometragem diferente de opção existente', () => {
    const vehicle = buildVehicleFromForm({
      ...base,
      annualMileageKm: '15.000',
    })
    const initialized = initializeVehicleForm(vehicle, 19_671, true)
    expect(initialized.useCurrentMileage).toBe(false)
    expect(initialized.form.annualMileageKm).toBe('15000')
  })

  it('não depende de veículo atual para abrir o formulário', () => {
    const initialized = initializeVehicleForm(undefined, undefined, true)
    expect(initialized.useCurrentMileage).toBe(false)
    expect(initialized.form.annualMileageKm).toBe('')
  })

  it('copia a referência sem modificar outros campos do formulário', () => {
    const form = { ...base, annualMileageKm: '10.000' }
    const updated = applyCurrentMileage(form, 20_000)
    expect(updated.annualMileageKm).toBe('20000')
    expect(updated.name).toBe(form.name)
  })
})
