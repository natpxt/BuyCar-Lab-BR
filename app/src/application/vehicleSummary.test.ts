import { describe, expect, it } from 'vitest'
import type { Vehicle } from '../domain/vehicle'
import {
  calculateVehicleCardSummary,
  findLowestMonthlyCashTcoVehicleIds,
} from './vehicleSummary'

const vehicle: Vehicle = {
  name: 'Tiida',
  powertrain: 'ICE',
  annualMileageKm: 12_000,
  vehicleValue: 36_467,
  annualDepreciationRate: 0.05,
  annualCosts: {
    insurance: 1_200,
    propertyTax: 0,
    licensing: 174.08,
    maintenance: 1_200,
  },
  fuel: {
    description: 'Gasolina',
    consumption: { unit: 'km/L', value: 10 },
    pricePerLiter: 5,
  },
}

describe('resumo dos cards de veículos', () => {
  it('usa o TCO de caixa mensal como custo mensal', () => {
    expect(calculateVehicleCardSummary(vehicle).monthlyCashTco).toBeCloseTo(
      (6_000 + 1_200 + 174.08 + 1_200) / 12,
      12,
    )
  })

  it('preserva valor de mercado e quilometragem', () => {
    expect(calculateVehicleCardSummary(vehicle)).toMatchObject({
      name: 'Tiida',
      annualMileageKm: 12_000,
      marketValue: 36_467,
    })
  })

  it('funciona igualmente para veículo atual e opção de troca', () => {
    const current = calculateVehicleCardSummary(vehicle)
    const option = calculateVehicleCardSummary({ ...vehicle, name: 'Opção' })
    expect(current.monthlyCashTco).toBe(option.monthlyCashTco)
  })

  it('não modifica o veículo', () => {
    const before = structuredClone(vehicle)
    calculateVehicleCardSummary(vehicle)
    expect(vehicle).toEqual(before)
  })
  it('identifica a opção com menor TCO de caixa mensal', () => {
    const expensive = { ...vehicle, name: 'Mais cara', annualCosts: { ...vehicle.annualCosts, maintenance: 2_400 } }
    expect(findLowestMonthlyCashTcoVehicleIds([
      { id: 'cheap', vehicle },
      { id: 'expensive', vehicle: expensive },
    ])).toEqual(['cheap'])
  })

  it('preserva empates sem escolher artificialmente um veículo', () => {
    expect(findLowestMonthlyCashTcoVehicleIds([
      { id: 'first', vehicle },
      { id: 'second', vehicle: { ...vehicle, name: 'Mesmo custo' } },
    ])).toEqual(['first', 'second'])
  })

  it('não cria destaque sem opções e não modifica as entradas', () => {
    const candidates = [{ id: 'vehicle', vehicle }]
    const before = structuredClone(candidates)
    expect(findLowestMonthlyCashTcoVehicleIds([])).toEqual([])
    findLowestMonthlyCashTcoVehicleIds(candidates)
    expect(candidates).toEqual(before)
  })
})
