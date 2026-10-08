import { calculateVehicleTco } from '../domain/tco'
import type { Vehicle } from '../domain/vehicle'

export interface VehicleCardSummary {
  readonly name: string
  readonly annualMileageKm: number
  readonly monthlyCashTco: number
  readonly marketValue: number
}

export function calculateVehicleCardSummary(
  vehicle: Vehicle,
): VehicleCardSummary {
  return {
    name: vehicle.name,
    annualMileageKm: vehicle.annualMileageKm,
    monthlyCashTco: calculateVehicleTco(vehicle).cashTco.monthly,
    marketValue: vehicle.vehicleValue,
  }
}
