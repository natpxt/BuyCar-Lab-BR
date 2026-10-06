import {
  assertValidVehicle,
  DomainValidationError,
  type ElectricityParameters,
  type FuelParameters,
  type ValidationIssue,
  type Vehicle,
} from './vehicle'

export interface CostByPeriod {
  readonly annual: number
  readonly monthly: number
  readonly perKm: number
}

export interface AnnualTcoBreakdown {
  readonly fuel: number
  readonly electricity: number
  readonly insurance: number
  readonly propertyTax: number
  readonly licensing: number
  readonly maintenance: number
  readonly depreciation: number
}

export interface TcoResult {
  readonly annualBreakdown: AnnualTcoBreakdown
  readonly cashTco: CostByPeriod
  readonly economicTco: CostByPeriod
}

function assertNumber(
  field: string,
  value: number,
  options: { positive?: boolean; maximum?: number } = {},
): void {
  let issue: ValidationIssue | undefined

  if (!Number.isFinite(value)) {
    issue = {
      field,
      code: 'notFinite',
      message: `${field} deve ser um número finito`,
    }
  } else if (options.positive ? value <= 0 : value < 0) {
    issue = {
      field,
      code: options.positive ? 'notPositive' : 'negative',
      message: options.positive
        ? `${field} deve ser maior que zero`
        : `${field} não pode ser negativo`,
    }
  } else if (options.maximum !== undefined && value > options.maximum) {
    issue = {
      field,
      code: 'outOfRange',
      message: `${field} deve estar entre zero e ${options.maximum}`,
    }
  }

  if (issue) {
    throw new DomainValidationError([issue])
  }
}

function assertFiniteResult(field: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new DomainValidationError([{
      field,
      code: 'notFinite',
      message: `${field} produziu um resultado não finito`,
    }])
  }
  return value
}

function periodize(annual: number, annualMileageKm: number): CostByPeriod {
  assertNumber('annualMileageKm', annualMileageKm, { positive: true })
  return {
    annual,
    monthly: annual / 12,
    perKm: annual / annualMileageKm,
  }
}

export function calculateAnnualFuelCost(
  distanceKm: number,
  fuel: FuelParameters,
): number {
  assertNumber('distanceKm', distanceKm)
  assertNumber('fuel.consumption.value', fuel.consumption.value, {
    positive: true,
  })
  assertNumber('fuel.pricePerLiter', fuel.pricePerLiter)

  let liters: number
  switch (fuel.consumption.unit) {
    case 'km/L':
      liters = distanceKm / fuel.consumption.value
      break
    case 'L/100km':
      liters = distanceKm * fuel.consumption.value / 100
      break
    default:
      throw new DomainValidationError([{
        field: 'fuel.consumption.unit',
        code: 'unsupported',
        message: 'fuel.consumption.unit deve ser km/L ou L/100km',
      }])
  }

  return assertFiniteResult('annualFuelCost', liters * fuel.pricePerLiter)
}

export function calculateAnnualElectricityCost(
  distanceKm: number,
  electricity: ElectricityParameters,
): number {
  assertNumber('distanceKm', distanceKm)
  assertNumber(
    'electricity.consumptionKwhPer100Km',
    electricity.consumptionKwhPer100Km,
    { positive: true },
  )
  assertNumber('electricity.pricePerKwh', electricity.pricePerKwh)
  assertNumber('electricity.chargingLossRate', electricity.chargingLossRate)

  const energyKwh = distanceKm * electricity.consumptionKwhPer100Km / 100
  const cost = energyKwh
    * electricity.pricePerKwh
    * (1 + electricity.chargingLossRate)

  return assertFiniteResult('annualElectricityCost', cost)
}

export function calculateAnnualDepreciation(
  vehicleValue: number,
  annualDepreciationRate: number,
): number {
  assertNumber('vehicleValue', vehicleValue)
  assertNumber('annualDepreciationRate', annualDepreciationRate, {
    maximum: 1,
  })
  return assertFiniteResult(
    'annualDepreciation',
    vehicleValue * annualDepreciationRate,
  )
}

export function calculateVehicleTco(vehicle: Vehicle): TcoResult {
  assertValidVehicle(vehicle)

  let fuel = 0
  let electricity = 0

  switch (vehicle.powertrain) {
    case 'ICE':
    case 'HEV':
      fuel = calculateAnnualFuelCost(vehicle.annualMileageKm, vehicle.fuel)
      break
    case 'BEV':
      electricity = calculateAnnualElectricityCost(
        vehicle.annualMileageKm,
        vehicle.electricity,
      )
      break
    case 'PHEV':
      fuel = calculateAnnualFuelCost(
        vehicle.annualMileageKm * vehicle.combustionShare,
        vehicle.fuel,
      )
      electricity = calculateAnnualElectricityCost(
        vehicle.annualMileageKm * vehicle.electricShare,
        vehicle.electricity,
      )
      break
  }

  const depreciation = calculateAnnualDepreciation(
    vehicle.vehicleValue,
    vehicle.annualDepreciationRate,
  )
  const annualBreakdown: AnnualTcoBreakdown = {
    fuel,
    electricity,
    insurance: vehicle.annualCosts.insurance,
    propertyTax: vehicle.annualCosts.propertyTax,
    licensing: vehicle.annualCosts.licensing,
    maintenance: vehicle.annualCosts.maintenance,
    depreciation,
  }
  const cashAnnual = assertFiniteResult(
    'cashTco.annual',
    fuel
      + electricity
      + annualBreakdown.insurance
      + annualBreakdown.propertyTax
      + annualBreakdown.licensing
      + annualBreakdown.maintenance,
  )
  const economicAnnual = assertFiniteResult(
    'economicTco.annual',
    cashAnnual + depreciation,
  )

  return {
    annualBreakdown,
    cashTco: periodize(cashAnnual, vehicle.annualMileageKm),
    economicTco: periodize(economicAnnual, vehicle.annualMileageKm),
  }
}

export function calculateOperationalSavings(
  currentVehicle: Vehicle,
  candidateVehicle: Vehicle,
): CostByPeriod {
  const current = calculateVehicleTco(currentVehicle).cashTco
  const candidate = calculateVehicleTco(candidateVehicle).cashTco

  return {
    annual: current.annual - candidate.annual,
    monthly: current.monthly - candidate.monthly,
    perKm: current.perKm - candidate.perKm,
  }
}
