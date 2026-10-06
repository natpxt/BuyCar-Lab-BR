export type Powertrain = 'ICE' | 'HEV' | 'PHEV' | 'BEV'

export type FuelConsumption =
  | { readonly unit: 'km/L'; readonly value: number }
  | { readonly unit: 'L/100km'; readonly value: number }

export interface FuelParameters {
  readonly description: string
  readonly consumption: FuelConsumption
  readonly pricePerLiter: number
}

export interface ElectricityParameters {
  readonly consumptionKwhPer100Km: number
  readonly pricePerKwh: number
  readonly chargingLossRate: number
}

export interface AnnualVehicleCosts {
  readonly insurance: number
  readonly propertyTax: number
  readonly licensing: number
  readonly maintenance: number
}

interface VehicleBase {
  readonly name: string
  readonly annualMileageKm: number
  readonly vehicleValue: number
  readonly annualDepreciationRate: number
  readonly annualCosts: AnnualVehicleCosts
}

export interface IceVehicle extends VehicleBase {
  readonly powertrain: 'ICE'
  readonly fuel: FuelParameters
}

export interface HevVehicle extends VehicleBase {
  readonly powertrain: 'HEV'
  readonly fuel: FuelParameters
}

export interface PhevVehicle extends VehicleBase {
  readonly powertrain: 'PHEV'
  readonly fuel: FuelParameters
  readonly electricity: ElectricityParameters
  readonly electricShare: number
  readonly combustionShare: number
}

export interface BevVehicle extends VehicleBase {
  readonly powertrain: 'BEV'
  readonly electricity: ElectricityParameters
}

export type Vehicle = IceVehicle | HevVehicle | PhevVehicle | BevVehicle

export type ValidationCode =
  | 'required'
  | 'notFinite'
  | 'negative'
  | 'notPositive'
  | 'outOfRange'
  | 'invalidTotal'
  | 'unsupported'

export interface ValidationIssue {
  readonly field: string
  readonly code: ValidationCode
  readonly message: string
}

export class DomainValidationError extends Error {
  readonly issues: readonly ValidationIssue[]

  constructor(issues: readonly ValidationIssue[]) {
    super(issues.map((issue) => issue.message).join('; '))
    this.name = 'DomainValidationError'
    this.issues = issues
  }
}

const powertrains: readonly Powertrain[] = ['ICE', 'HEV', 'PHEV', 'BEV']
const shareTolerance = 1e-12

function validateRequiredText(
  issues: ValidationIssue[],
  field: string,
  value: unknown,
): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ field, code: 'required', message: `${field} é obrigatório` })
  }
}

function validateNumber(
  issues: ValidationIssue[],
  field: string,
  value: unknown,
  options: { positive?: boolean; maximum?: number } = {},
): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({
      field,
      code: 'notFinite',
      message: `${field} deve ser um número finito`,
    })
    return false
  }

  if (options.positive ? value <= 0 : value < 0) {
    issues.push({
      field,
      code: options.positive ? 'notPositive' : 'negative',
      message: options.positive
        ? `${field} deve ser maior que zero`
        : `${field} não pode ser negativo`,
    })
    return false
  }

  if (options.maximum !== undefined && value > options.maximum) {
    issues.push({
      field,
      code: 'outOfRange',
      message: `${field} deve estar entre zero e ${options.maximum}`,
    })
    return false
  }

  return true
}

function validateFuel(
  issues: ValidationIssue[],
  value: unknown,
  prefix: string,
): void {
  if (typeof value !== 'object' || value === null) {
    issues.push({ field: prefix, code: 'required', message: `${prefix} é obrigatório` })
    return
  }

  const fuel = value as Record<string, unknown>
  validateRequiredText(issues, `${prefix}.description`, fuel.description)
  validateNumber(issues, `${prefix}.pricePerLiter`, fuel.pricePerLiter)

  if (typeof fuel.consumption !== 'object' || fuel.consumption === null) {
    issues.push({
      field: `${prefix}.consumption`,
      code: 'required',
      message: `${prefix}.consumption é obrigatório`,
    })
    return
  }

  const consumption = fuel.consumption as Record<string, unknown>
  if (consumption.unit !== 'km/L' && consumption.unit !== 'L/100km') {
    issues.push({
      field: `${prefix}.consumption.unit`,
      code: 'unsupported',
      message: `${prefix}.consumption.unit deve ser km/L ou L/100km`,
    })
  }
  validateNumber(
    issues,
    `${prefix}.consumption.value`,
    consumption.value,
    { positive: true },
  )
}

function validateElectricity(
  issues: ValidationIssue[],
  value: unknown,
  prefix: string,
): void {
  if (typeof value !== 'object' || value === null) {
    issues.push({ field: prefix, code: 'required', message: `${prefix} é obrigatório` })
    return
  }

  const electricity = value as Record<string, unknown>
  validateNumber(
    issues,
    `${prefix}.consumptionKwhPer100Km`,
    electricity.consumptionKwhPer100Km,
    { positive: true },
  )
  validateNumber(issues, `${prefix}.pricePerKwh`, electricity.pricePerKwh)
  validateNumber(
    issues,
    `${prefix}.chargingLossRate`,
    electricity.chargingLossRate,
  )
}

export function validateVehicle(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (typeof input !== 'object' || input === null) {
    return [{
      field: 'vehicle',
      code: 'required',
      message: 'veículo é obrigatório',
    }]
  }

  const vehicle = input as Record<string, unknown>
  validateRequiredText(issues, 'name', vehicle.name)
  validateNumber(issues, 'annualMileageKm', vehicle.annualMileageKm, {
    positive: true,
  })
  validateNumber(issues, 'vehicleValue', vehicle.vehicleValue)
  validateNumber(
    issues,
    'annualDepreciationRate',
    vehicle.annualDepreciationRate,
    { maximum: 1 },
  )

  if (typeof vehicle.annualCosts !== 'object' || vehicle.annualCosts === null) {
    issues.push({
      field: 'annualCosts',
      code: 'required',
      message: 'annualCosts é obrigatório',
    })
  } else {
    const annualCosts = vehicle.annualCosts as Record<string, unknown>
    validateNumber(issues, 'annualCosts.insurance', annualCosts.insurance)
    validateNumber(issues, 'annualCosts.propertyTax', annualCosts.propertyTax)
    validateNumber(issues, 'annualCosts.licensing', annualCosts.licensing)
    validateNumber(issues, 'annualCosts.maintenance', annualCosts.maintenance)
  }

  if (!powertrains.includes(vehicle.powertrain as Powertrain)) {
    issues.push({
      field: 'powertrain',
      code: 'unsupported',
      message: 'powertrain deve ser ICE, HEV, PHEV ou BEV',
    })
    return issues
  }

  switch (vehicle.powertrain) {
    case 'ICE':
    case 'HEV':
      validateFuel(issues, vehicle.fuel, 'fuel')
      break
    case 'BEV':
      validateElectricity(issues, vehicle.electricity, 'electricity')
      break
    case 'PHEV': {
      validateFuel(issues, vehicle.fuel, 'fuel')
      validateElectricity(issues, vehicle.electricity, 'electricity')
      const electricShare = vehicle.electricShare
      const combustionShare = vehicle.combustionShare
      const electricIsValid = validateNumber(
        issues,
        'electricShare',
        electricShare,
        { maximum: 1 },
      )
      const combustionIsValid = validateNumber(
        issues,
        'combustionShare',
        combustionShare,
        { maximum: 1 },
      )

      if (
        electricIsValid
        && combustionIsValid
        && Math.abs(electricShare + combustionShare - 1) > shareTolerance
      ) {
        issues.push({
          field: 'electricShare,combustionShare',
          code: 'invalidTotal',
          message: 'os percentuais elétrico e a combustão devem totalizar 100%',
        })
      }
      break
    }
  }

  return issues
}

export function assertValidVehicle(input: unknown): asserts input is Vehicle {
  const issues = validateVehicle(input)
  if (issues.length > 0) {
    throw new DomainValidationError(issues)
  }
}
