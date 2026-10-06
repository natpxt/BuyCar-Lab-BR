import { describe, expect, it } from 'vitest'
import {
  DomainValidationError,
  type BevVehicle,
  type FuelParameters,
  type HevVehicle,
  type IceVehicle,
  type PhevVehicle,
} from './vehicle'
import {
  calculateAnnualDepreciation,
  calculateAnnualElectricityCost,
  calculateAnnualFuelCost,
  calculateOperationalSavings,
  calculateVehicleTco,
} from './tco'

const initialOdometerKm = 204_860
const finalOdometerKm = 226_298
const annualMileageKm = finalOdometerKm - initialOdometerKm

const tiida: IceVehicle = {
  name: 'Nissan Tiida',
  powertrain: 'ICE',
  annualMileageKm,
  vehicleValue: 37_044,
  annualDepreciationRate: 0.03,
  annualCosts: {
    insurance: 3_516.24,
    propertyTax: 1_404.88,
    licensing: 174.08,
    maintenance: 48_321.20 / 88_533 * annualMileageKm,
  },
  fuel: {
    description: 'Etanol',
    consumption: { unit: 'km/L', value: 7.68 },
    pricePerLiter: 3.89,
  },
}

const candidate: BevVehicle = {
  name: 'Candidato elétrico',
  powertrain: 'BEV',
  annualMileageKm,
  vehicleValue: 120_000,
  annualDepreciationRate: 0.035,
  annualCosts: {
    insurance: 5_600,
    propertyTax: 4_400,
    licensing: 174.08,
    maintenance: 770,
  },
  electricity: {
    consumptionKwhPer100Km: 12,
    pricePerKwh: 2,
    chargingLossRate: 0.1,
  },
}

describe('golden cases de TCO', () => {
  it('usa a diferença de odômetros somente como fixture de quilometragem', () => {
    expect(annualMileageKm).toBe(21_438)
  })

  it('reconcilia combustível, TCO e depreciação do Tiida', () => {
    const result = calculateVehicleTco(tiida)

    expect(result.annualBreakdown.fuel).toBeCloseTo(10_858.57, 2)
    expect(result.cashTco.annual).toBeCloseTo(27_654.60, 2)
    expect(result.cashTco.monthly).toBeCloseTo(2_304.55, 2)
    expect(result.cashTco.perKm).toBeCloseTo(27_654.60 / 21_438, 6)
    expect(result.annualBreakdown.depreciation).toBeCloseTo(1_111.32, 2)
    expect(result.economicTco.annual).toBeCloseTo(28_765.92, 2)
    expect(result.economicTco.monthly).toBeCloseTo(2_397.16, 2)
  })

  it('reconcilia energia e TCO do candidato', () => {
    const result = calculateVehicleTco(candidate)

    expect(result.annualBreakdown.electricity).toBeCloseTo(5_659.63, 2)
    expect(result.cashTco.annual).toBeCloseTo(16_603.71, 2)
    expect(result.cashTco.monthly).toBeCloseTo(1_383.64, 2)
    expect(result.annualBreakdown.depreciation).toBeCloseTo(4_200, 2)
    expect(result.economicTco.annual).toBeCloseTo(20_803.71, 2)
    expect(result.economicTco.monthly).toBeCloseTo(1_733.64, 2)
  })

  it('calcula economia operacional anual, mensal e por km', () => {
    const savings = calculateOperationalSavings(tiida, candidate)

    expect(savings.annual).toBeCloseTo(11_050.89, 2)
    expect(savings.monthly).toBeCloseTo(920.91, 2)
    expect(savings.perKm).toBeCloseTo(11_050.89 / 21_438, 6)
  })
})

describe('fontes de energia', () => {
  it('produz o mesmo custo para consumos equivalentes nas duas unidades', () => {
    const distanceKm = 1_000
    const pricePerLiter = 5

    const kmPerLiter = calculateAnnualFuelCost(distanceKm, {
      description: 'Combustível',
      consumption: { unit: 'km/L', value: 12.5 },
      pricePerLiter,
    })
    const litersPer100Km = calculateAnnualFuelCost(distanceKm, {
      description: 'Combustível',
      consumption: { unit: 'L/100km', value: 8 },
      pricePerLiter,
    })

    expect(kmPerLiter).toBe(400)
    expect(litersPer100Km).toBe(400)
  })

  it('rejeita em runtime uma unidade de consumo desconhecida', () => {
    const invalidFuel = {
      description: 'Combustível',
      consumption: { unit: 'mpg', value: 30 },
      pricePerLiter: 5,
    } as unknown as FuelParameters

    expect(() => calculateAnnualFuelCost(1_000, invalidFuel)).toThrow(
      DomainValidationError,
    )
    expect(() => calculateAnnualFuelCost(1_000, invalidFuel)).toThrow(
      'fuel.consumption.unit deve ser km/L ou L/100km',
    )
  })

  it('calcula ICE e HEV com a mesma regra de combustível', () => {
    const hev: HevVehicle = {
      ...tiida,
      name: 'Híbrido',
      powertrain: 'HEV',
    }

    expect(calculateVehicleTco(hev)).toEqual(calculateVehicleTco(tiida))
  })

  it('aplica perdas de recarga como adicional multiplicativo', () => {
    const withoutLosses = calculateAnnualElectricityCost(10_000, {
      consumptionKwhPer100Km: 10,
      pricePerKwh: 1,
      chargingLossRate: 0,
    })
    const withLosses = calculateAnnualElectricityCost(10_000, {
      consumptionKwhPer100Km: 10,
      pricePerKwh: 1,
      chargingLossRate: 0.1,
    })

    expect(withoutLosses).toBe(1_000)
    expect(withLosses).toBeCloseTo(1_100, 12)
  })

  it.each([
    { electricShare: 0.6, combustionShare: 0.4 },
    { electricShare: 1, combustionShare: 0 },
    { electricShare: 0, combustionShare: 1 },
  ])('combina as parcelas do PHEV sem dupla contagem: %o', (shares) => {
    const phev: PhevVehicle = {
      ...tiida,
      name: 'Híbrido plug-in',
      powertrain: 'PHEV',
      ...shares,
      electricity: candidate.electricity,
    }
    const result = calculateVehicleTco(phev)
    const expectedFuel = calculateAnnualFuelCost(
      annualMileageKm * shares.combustionShare,
      tiida.fuel,
    )
    const expectedElectricity = calculateAnnualElectricityCost(
      annualMileageKm * shares.electricShare,
      candidate.electricity,
    )

    expect(result.annualBreakdown.fuel).toBeCloseTo(expectedFuel, 12)
    expect(result.annualBreakdown.electricity).toBeCloseTo(
      expectedElectricity,
      12,
    )
  })
})

describe('invariantes do cálculo', () => {
  it('calcula depreciação zero sem criar custo plausível adicional', () => {
    expect(calculateAnnualDepreciation(120_000, 0)).toBe(0)
  })

  it('preserva as entradas e retorna o mesmo resultado em chamadas repetidas', () => {
    const before = structuredClone(candidate)
    const first = calculateVehicleTco(candidate)
    const second = calculateVehicleTco(candidate)

    expect(candidate).toEqual(before)
    expect(second).toEqual(first)
  })

  it('preserva a precisão interna sem arredondamento intermediário', () => {
    const result = calculateVehicleTco(candidate)

    expect(result.annualBreakdown.electricity).toBe(5_659.6320000000005)
    expect(result.cashTco.annual).toBe(16_603.712)
    expect(result.cashTco.monthly).toBe(16_603.712 / 12)
  })

  it('mantém o sinal quando o candidato custa mais que o atual', () => {
    const savings = calculateOperationalSavings(candidate, tiida)

    expect(savings.annual).toBeLessThan(0)
    expect(savings.monthly).toBeLessThan(0)
    expect(savings.perKm).toBeLessThan(0)
  })

  it('rejeita entradas que produziriam resultados não finitos', () => {
    expect(() => calculateAnnualFuelCost(Number.MAX_VALUE, {
      description: 'Combustível',
      consumption: { unit: 'L/100km', value: Number.MAX_VALUE },
      pricePerLiter: Number.MAX_VALUE,
    })).toThrow('resultado não finito')
  })
})
