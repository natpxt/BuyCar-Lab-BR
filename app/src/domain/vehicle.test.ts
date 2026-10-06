import { describe, expect, it } from 'vitest'
import {
  assertValidVehicle,
  DomainValidationError,
  type PhevVehicle,
  type Vehicle,
  validateVehicle,
} from './vehicle'

const validIce: Vehicle = {
  name: 'Veículo atual',
  powertrain: 'ICE',
  annualMileageKm: 20_000,
  vehicleValue: 40_000,
  annualDepreciationRate: 0.03,
  annualCosts: {
    insurance: 0,
    propertyTax: 0,
    licensing: 0,
    maintenance: 0,
  },
  fuel: {
    description: 'Etanol',
    consumption: { unit: 'km/L', value: 8 },
    pricePerLiter: 4,
  },
}

const validPhev: PhevVehicle = {
  ...validIce,
  name: 'Híbrido plug-in',
  powertrain: 'PHEV',
  electricShare: 0.6,
  combustionShare: 0.4,
  electricity: {
    consumptionKwhPer100Km: 15,
    pricePerKwh: 1,
    chargingLossRate: 0.1,
  },
}

describe('validateVehicle', () => {
  it('aceita custos e taxas explicitamente iguais a zero', () => {
    expect(validateVehicle(validIce)).toEqual([])
  })

  it('exige que os percentuais do PHEV totalizem 100%', () => {
    const issues = validateVehicle({
      ...validPhev,
      electricShare: 0.7,
      combustionShare: 0.4,
    })

    expect(issues).toContainEqual(expect.objectContaining({
      code: 'invalidTotal',
      field: 'electricShare,combustionShare',
    }))
  })

  it('rejeita textos vazios, números não finitos e valores negativos', () => {
    const issues = validateVehicle({
      ...validIce,
      name: '   ',
      annualMileageKm: Number.POSITIVE_INFINITY,
      annualCosts: {
        ...validIce.annualCosts,
        maintenance: -1,
      },
    })

    expect(issues.map(({ code, field }) => ({ code, field }))).toEqual(
      expect.arrayContaining([
        { code: 'required', field: 'name' },
        { code: 'notFinite', field: 'annualMileageKm' },
        { code: 'negative', field: 'annualCosts.maintenance' },
      ]),
    )
  })

  it('rejeita consumo zero e unidade desconhecida', () => {
    const issues = validateVehicle({
      ...validIce,
      fuel: {
        ...validIce.fuel,
        consumption: { unit: 'mpg', value: 0 },
      },
    })

    expect(issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['unsupported', 'notPositive']),
    )
  })

  it('lança um erro com todos os problemas encontrados', () => {
    const invalidVehicle = {
      ...validPhev,
      annualDepreciationRate: 1.1,
      electricShare: 0.8,
      combustionShare: 0.8,
    }

    expect(() => assertValidVehicle(invalidVehicle)).toThrow(
      DomainValidationError,
    )

    try {
      assertValidVehicle(invalidVehicle)
    } catch (error) {
      expect(error).toBeInstanceOf(DomainValidationError)
      expect((error as DomainValidationError).issues).toHaveLength(2)
    }
  })
})
