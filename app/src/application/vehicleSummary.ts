import { calculateVehicleTco } from '../domain/tco'
import type { Vehicle } from '../domain/vehicle'

export interface VehicleCardSummary {
  readonly name: string
  readonly annualMileageKm: number
  readonly monthlyCashTco: number
  readonly marketValue: number
}

export interface VehicleCardCandidate {
  readonly id: string
  readonly vehicle: Vehicle
}

const TCO_TIE_TOLERANCE = 0.005

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

export function findLowestMonthlyCashTcoVehicleIds(
  candidates: readonly VehicleCardCandidate[],
): readonly string[] {
  if (candidates.length === 0) return []
  const costs = candidates.map((candidate) => ({
    id: candidate.id,
    monthlyCashTco: calculateVehicleCardSummary(candidate.vehicle).monthlyCashTco,
  }))
  const lowest = Math.min(...costs.map((candidate) => candidate.monthlyCashTco))
  return costs
    .filter((candidate) => Math.abs(candidate.monthlyCashTco - lowest) <= TCO_TIE_TOLERANCE)
    .map((candidate) => candidate.id)
}
