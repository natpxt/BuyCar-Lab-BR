import {
  assertValidVehicle,
  type FuelConsumption,
  type Powertrain,
  type Vehicle,
} from '../domain/vehicle'
import {
  decimalToPercentageInput,
  numberToInput,
  parsePtBrNumber,
  percentageInputToDecimal,
} from './format'

export interface VehicleFormState {
  readonly name: string
  readonly powertrain: Powertrain
  readonly annualMileageKm: string
  readonly vehicleValue: string
  readonly annualDepreciationPercent: string
  readonly insurance: string
  readonly propertyTax: string
  readonly propertyTaxAutomatic: boolean
  readonly licensing: string
  readonly licensingAutomatic: boolean
  readonly maintenance: string
  readonly fuelDescription: string
  readonly fuelConsumptionValue: string
  readonly fuelConsumptionUnit: FuelConsumption['unit']
  readonly pricePerLiter: string
  readonly consumptionKwhPer100Km: string
  readonly pricePerKwh: string
  readonly chargingLossPercent: string
  readonly electricSharePercent: string
  readonly combustionSharePercent: string
}

export const SP_PASSENGER_CAR_PROPERTY_TAX_RATE = 0.04
export const SP_LICENSE_FEE_2026 = 174.08
const monetaryTolerance = 0.01

export function calculateSpPropertyTaxDefault(vehicleValue: number): number {
  return vehicleValue * SP_PASSENGER_CAR_PROPERTY_TAX_RATE
}

function matchesMoneyDefault(value: number, expected: number): boolean {
  return Math.abs(value - expected) <= monetaryTolerance
}

function automaticPropertyTaxInput(vehicleValue: string): string {
  try {
    return numberToInput(calculateSpPropertyTaxDefault(
      parsePtBrNumber(vehicleValue, 'Valor do veículo'),
    ))
  } catch {
    return ''
  }
}

export function updateVehicleValue(
  form: VehicleFormState,
  vehicleValue: string,
): VehicleFormState {
  return {
    ...form,
    vehicleValue,
    propertyTax: form.propertyTaxAutomatic
      ? automaticPropertyTaxInput(vehicleValue)
      : form.propertyTax,
  }
}

export function setPropertyTaxAutomatic(
  form: VehicleFormState,
  automatic: boolean,
): VehicleFormState {
  return {
    ...form,
    propertyTaxAutomatic: automatic,
    propertyTax: automatic
      ? automaticPropertyTaxInput(form.vehicleValue)
      : form.propertyTax,
  }
}

export function setLicensingAutomatic(
  form: VehicleFormState,
  automatic: boolean,
): VehicleFormState {
  return {
    ...form,
    licensingAutomatic: automatic,
    licensing: automatic
      ? numberToInput(SP_LICENSE_FEE_2026)
      : form.licensing,
  }
}

export function createVehicleFormState(vehicle?: Vehicle): VehicleFormState {
  const fuel = vehicle && 'fuel' in vehicle ? vehicle.fuel : undefined
  const electricity = vehicle && 'electricity' in vehicle
    ? vehicle.electricity
    : undefined
  const propertyTaxAutomatic = vehicle === undefined
    || matchesMoneyDefault(
      vehicle.annualCosts.propertyTax,
      calculateSpPropertyTaxDefault(vehicle.vehicleValue),
    )
  const licensingAutomatic = vehicle === undefined
    || matchesMoneyDefault(
      vehicle.annualCosts.licensing,
      SP_LICENSE_FEE_2026,
    )
  return {
    name: vehicle?.name ?? '',
    powertrain: vehicle?.powertrain ?? 'ICE',
    annualMileageKm: numberToInput(vehicle?.annualMileageKm),
    vehicleValue: numberToInput(vehicle?.vehicleValue),
    annualDepreciationPercent: vehicle
      ? decimalToPercentageInput(vehicle.annualDepreciationRate)
      : '',
    insurance: numberToInput(vehicle?.annualCosts.insurance),
    propertyTax: numberToInput(vehicle?.annualCosts.propertyTax),
    propertyTaxAutomatic,
    licensing: numberToInput(
      vehicle?.annualCosts.licensing ?? SP_LICENSE_FEE_2026,
    ),
    licensingAutomatic,
    maintenance: numberToInput(vehicle?.annualCosts.maintenance),
    fuelDescription: fuel?.description ?? 'Gasolina',
    fuelConsumptionValue: numberToInput(fuel?.consumption.value),
    fuelConsumptionUnit: fuel?.consumption.unit ?? 'km/L',
    pricePerLiter: numberToInput(fuel?.pricePerLiter),
    consumptionKwhPer100Km: numberToInput(
      electricity?.consumptionKwhPer100Km,
    ),
    pricePerKwh: numberToInput(electricity?.pricePerKwh),
    chargingLossPercent: electricity
      ? decimalToPercentageInput(electricity.chargingLossRate)
      : '0',
    electricSharePercent: vehicle?.powertrain === 'PHEV'
      ? decimalToPercentageInput(vehicle.electricShare)
      : '50',
    combustionSharePercent: vehicle?.powertrain === 'PHEV'
      ? decimalToPercentageInput(vehicle.combustionShare)
      : '50',
  }
}

export function buildVehicleFromForm(form: VehicleFormState): Vehicle {
  const common = {
    name: form.name.trim(),
    powertrain: form.powertrain,
    annualMileageKm: parsePtBrNumber(
      form.annualMileageKm,
      'Quilometragem anual',
    ),
    vehicleValue: parsePtBrNumber(form.vehicleValue, 'Valor do veículo'),
    annualDepreciationRate: percentageInputToDecimal(
      form.annualDepreciationPercent,
      'Depreciação anual',
    ),
    annualCosts: {
      insurance: parsePtBrNumber(form.insurance, 'Seguro'),
      propertyTax: parsePtBrNumber(form.propertyTax, 'IPVA'),
      licensing: parsePtBrNumber(form.licensing, 'Licenciamento'),
      maintenance: parsePtBrNumber(form.maintenance, 'Manutenção'),
    },
  }
  const buildFuel = () => ({
    description: form.fuelDescription.trim(),
    consumption: {
      unit: form.fuelConsumptionUnit,
      value: parsePtBrNumber(form.fuelConsumptionValue, 'Consumo'),
    },
    pricePerLiter: parsePtBrNumber(
      form.pricePerLiter,
      'Preço do combustível',
    ),
  })
  const buildElectricity = () => ({
    consumptionKwhPer100Km: parsePtBrNumber(
      form.consumptionKwhPer100Km,
      'Consumo elétrico',
    ),
    pricePerKwh: parsePtBrNumber(form.pricePerKwh, 'Preço da energia'),
    chargingLossRate: percentageInputToDecimal(
      form.chargingLossPercent,
      'Perdas de carregamento',
    ),
  })

  let vehicle: Vehicle
  switch (form.powertrain) {
    case 'ICE':
    case 'HEV':
      vehicle = {
        ...common,
        powertrain: form.powertrain,
        fuel: buildFuel(),
      }
      break
    case 'BEV':
      vehicle = {
        ...common,
        powertrain: 'BEV',
        electricity: buildElectricity(),
      }
      break
    case 'PHEV':
      vehicle = {
        ...common,
        powertrain: 'PHEV',
        fuel: buildFuel(),
        electricity: buildElectricity(),
        electricShare: percentageInputToDecimal(
          form.electricSharePercent,
          'Uso elétrico',
        ),
        combustionShare: percentageInputToDecimal(
          form.combustionSharePercent,
          'Uso a combustão',
        ),
      }
      break
  }

  assertValidVehicle(vehicle)
  return vehicle
}
