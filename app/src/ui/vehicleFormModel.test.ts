import { describe, expect, it } from 'vitest'
import { buildVehicleFromForm, createVehicleFormState } from './vehicleFormModel'

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
})
