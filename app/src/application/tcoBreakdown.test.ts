import { describe, expect, it } from 'vitest'
import type { Vehicle } from '../domain/vehicle'
import {
  calculateTcoBreakdown,
  compareTcoBreakdowns,
} from './tcoBreakdown'

const common = {
  annualMileageKm: 12_000,
  vehicleValue: 100_000,
  annualDepreciationRate: 0.1,
  annualCosts: {
    insurance: 1_200,
    propertyTax: 4_000,
    licensing: 174.08,
    maintenance: 2_000,
  },
}

const fuel = {
  description: 'Gasolina',
  consumption: { unit: 'km/L' as const, value: 10 },
  pricePerLiter: 5,
}

const electricity = {
  consumptionKwhPer100Km: 20,
  pricePerKwh: 1,
  chargingLossRate: 0,
}

const ice: Vehicle = { ...common, name: 'ICE', powertrain: 'ICE', fuel }
const hev: Vehicle = {
  ...common,
  name: 'HEV',
  powertrain: 'HEV',
  fuel: { ...fuel, consumption: { unit: 'km/L', value: 20 } },
}
const bev: Vehicle = {
  ...common,
  name: 'BEV',
  powertrain: 'BEV',
  electricity,
}
const phev: Vehicle = {
  ...common,
  name: 'PHEV',
  powertrain: 'PHEV',
  fuel,
  electricity,
  electricShare: 0.5,
  combustionShare: 0.5,
}

describe('breakdown comparativo de TCO', () => {
  it('calcula combustível de ICE', () => {
    expect(calculateTcoBreakdown(ice).fuel.annual).toBe(6_000)
  })

  it('calcula combustível de HEV', () => {
    expect(calculateTcoBreakdown(hev).fuel.annual).toBe(3_000)
  })

  it('calcula energia elétrica de BEV', () => {
    expect(calculateTcoBreakdown(bev).electricity.annual).toBe(2_400)
  })

  it('separa combustível e eletricidade de PHEV', () => {
    const breakdown = calculateTcoBreakdown(phev)
    expect(breakdown.fuel.annual).toBe(3_000)
    expect(breakdown.electricity.annual).toBe(1_200)
  })

  it('expõe manutenção', () => {
    expect(calculateTcoBreakdown(ice).maintenance.annual).toBe(2_000)
  })

  it('expõe seguro', () => {
    expect(calculateTcoBreakdown(ice).insurance.annual).toBe(1_200)
  })

  it('expõe IPVA', () => {
    expect(calculateTcoBreakdown(ice).propertyTax.annual).toBe(4_000)
  })

  it('expõe licenciamento', () => {
    expect(calculateTcoBreakdown(ice).licensing.annual).toBe(174.08)
  })

  it('expõe depreciação', () => {
    expect(calculateTcoBreakdown(ice).depreciation.annual).toBe(10_000)
  })

  it('reconcilia os componentes do TCO de caixa', () => {
    const breakdown = calculateTcoBreakdown(phev)
    const sum = breakdown.fuel.annual
      + breakdown.electricity.annual
      + breakdown.maintenance.annual
      + breakdown.insurance.annual
      + breakdown.propertyTax.annual
      + breakdown.licensing.annual
    expect(sum).toBeCloseTo(breakdown.cashTco.annual, 12)
  })

  it('reconcilia TCO econômico com caixa e depreciação', () => {
    const breakdown = calculateTcoBreakdown(bev)
    expect(
      breakdown.cashTco.annual + breakdown.depreciation.annual,
    ).toBeCloseTo(breakdown.economicTco.annual, 12)
  })

  it('calcula diferença como atual menos opção', () => {
    const fuelRow = compareTcoBreakdowns(ice, bev).find(
      (row) => row.component === 'fuel',
    )
    expect(fuelRow?.difference.annual).toBe(6_000)
  })

  it('calcula visão mensal como anual dividido por 12', () => {
    const breakdown = calculateTcoBreakdown(phev)
    expect(breakdown.economicTco.monthly).toBe(
      breakdown.economicTco.annual / 12,
    )
  })

  it('não modifica os veículos de entrada', () => {
    const currentBefore = structuredClone(ice)
    const optionBefore = structuredClone(phev)
    compareTcoBreakdowns(ice, phev)
    expect(ice).toEqual(currentBefore)
    expect(phev).toEqual(optionBefore)
  })

  it('é determinístico', () => {
    expect(compareTcoBreakdowns(ice, phev)).toEqual(
      compareTcoBreakdowns(ice, phev),
    )
  })
})
