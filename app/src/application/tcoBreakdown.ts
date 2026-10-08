import { calculateVehicleTco } from '../domain/tco'
import type { Vehicle } from '../domain/vehicle'

export type TcoBreakdownComponent =
  | 'fuel'
  | 'electricity'
  | 'maintenance'
  | 'insurance'
  | 'propertyTax'
  | 'licensing'
  | 'cashTco'
  | 'depreciation'
  | 'economicTco'

export interface TcoBreakdownValue {
  readonly annual: number
  readonly monthly: number
  readonly applicable: boolean
}

export type TcoBreakdown = Readonly<
  Record<TcoBreakdownComponent, TcoBreakdownValue>
>

export interface ComparedTcoBreakdownRow {
  readonly component: TcoBreakdownComponent
  readonly current: TcoBreakdownValue
  readonly option: TcoBreakdownValue
  readonly difference: {
    readonly annual: number
    readonly monthly: number
  }
}

export const tcoBreakdownOrder: readonly TcoBreakdownComponent[] = [
  'fuel',
  'electricity',
  'maintenance',
  'insurance',
  'propertyTax',
  'licensing',
  'cashTco',
  'depreciation',
  'economicTco',
]

function value(annual: number, applicable = true): TcoBreakdownValue {
  return { annual, monthly: annual / 12, applicable }
}

export function calculateTcoBreakdown(vehicle: Vehicle): TcoBreakdown {
  const tco = calculateVehicleTco(vehicle)
  const breakdown = tco.annualBreakdown
  return {
    fuel: value(breakdown.fuel, 'fuel' in vehicle),
    electricity: value(breakdown.electricity, 'electricity' in vehicle),
    maintenance: value(breakdown.maintenance),
    insurance: value(breakdown.insurance),
    propertyTax: value(breakdown.propertyTax),
    licensing: value(breakdown.licensing),
    cashTco: value(tco.cashTco.annual),
    depreciation: value(breakdown.depreciation),
    economicTco: value(tco.economicTco.annual),
  }
}

export function compareTcoBreakdowns(
  currentVehicle: Vehicle,
  optionVehicle: Vehicle,
): readonly ComparedTcoBreakdownRow[] {
  const current = calculateTcoBreakdown(currentVehicle)
  const option = calculateTcoBreakdown(optionVehicle)
  return tcoBreakdownOrder.map((component) => ({
    component,
    current: current[component],
    option: option[component],
    difference: {
      annual: current[component].annual - option[component].annual,
      monthly: current[component].monthly - option[component].monthly,
    },
  }))
}
