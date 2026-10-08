import type {
  ComparedPriceScenario,
  ExtraPaymentStrategy,
  PriceScheduleEntry,
  PriceStrategyComparison,
} from '../domain/financing'

export type AmortizationTableView = 'monthly' | 'annual'
export type AmortizationTableScenario = ExtraPaymentStrategy

export interface AmortizationImpact {
  readonly interestSavings: number
  readonly interestSavingsPercentage: number
  readonly totalDisbursedSavings: number
  readonly monthsSaved: number
  readonly effectiveTermMonths: number
  readonly payoffPeriod: number
  readonly totalExtraPayments: number
}

export interface AnnualScheduleEntry {
  readonly year: number
  readonly openingBalance: number
  readonly interest: number
  readonly contractualPayment: number
  readonly principalAmortizedByPayment: number
  readonly extraPaymentApplied: number
  readonly periodicChargeTotal: number
  readonly totalPayment: number
  readonly closingBalance: number
}

export interface ScheduleRange {
  readonly start?: number
  readonly end?: number
}

export interface FinancingChartEntry {
  readonly period: number
  readonly baselineBalance?: number
  readonly scenarioBalance?: number
  readonly baselinePayment?: number
  readonly scenarioPayment?: number
  readonly interest?: number
  readonly principal?: number
  readonly extraPayment?: number
  readonly periodicCharges?: number
}

export interface ScheduleCsvData {
  readonly headers: readonly string[]
  readonly rows: readonly (readonly (string | number)[])[]
}

function normalizeComparisonResidue(
  difference: number,
  left: number,
  right: number,
): number {
  const tolerance = Number.EPSILON
    * Math.max(1, Math.abs(left), Math.abs(right))
    * 8
  return Math.abs(difference) <= tolerance ? 0 : difference
}

export function calculateAmortizationImpact(
  baseline: ComparedPriceScenario,
  scenario: ComparedPriceScenario,
): AmortizationImpact {
  const interestSavings = normalizeComparisonResidue(
    baseline.totalInterest - scenario.totalInterest,
    baseline.totalInterest,
    scenario.totalInterest,
  )
  const totalDisbursedSavings = normalizeComparisonResidue(
    baseline.totalDisbursed - scenario.totalDisbursed,
    baseline.totalDisbursed,
    scenario.totalDisbursed,
  )
  return {
    interestSavings,
    interestSavingsPercentage: baseline.totalInterest > 0
      ? interestSavings / baseline.totalInterest
      : 0,
    totalDisbursedSavings,
    monthsSaved:
      baseline.effectiveTermMonths - scenario.effectiveTermMonths,
    effectiveTermMonths: scenario.effectiveTermMonths,
    payoffPeriod: scenario.payoffPeriod,
    totalExtraPayments: scenario.totalExtraPayments,
  }
}

export function getStrategyScenario(
  comparison: PriceStrategyComparison,
  strategy: ExtraPaymentStrategy,
): ComparedPriceScenario {
  return comparison[strategy]
}

export function aggregateScheduleAnnually(
  schedule: readonly PriceScheduleEntry[],
): readonly AnnualScheduleEntry[] {
  const years: AnnualScheduleEntry[] = []

  for (let index = 0; index < schedule.length; index += 12) {
    const block = schedule.slice(index, index + 12)
    const first = block[0]
    const last = block.at(-1)
    if (first === undefined || last === undefined) {
      continue
    }

    years.push({
      year: Math.floor(index / 12) + 1,
      openingBalance: first.openingBalance,
      interest: block.reduce((total, entry) => total + entry.interest, 0),
      contractualPayment: block.reduce(
        (total, entry) => total + entry.contractualPayment,
        0,
      ),
      principalAmortizedByPayment: block.reduce(
        (total, entry) => total + entry.principalAmortizedByPayment,
        0,
      ),
      extraPaymentApplied: block.reduce(
        (total, entry) => total + entry.extraPaymentApplied,
        0,
      ),
      periodicChargeTotal: block.reduce(
        (total, entry) => total + entry.periodicChargeTotal,
        0,
      ),
      totalPayment: block.reduce(
        (total, entry) => total + entry.totalPayment,
        0,
      ),
      closingBalance: last.closingBalance,
    })
  }

  return years
}

function assertValidRange(range: ScheduleRange): void {
  const values = [range.start, range.end]
  if (values.some((value) => (
    value !== undefined
    && (!Number.isInteger(value) || value <= 0)
  ))) {
    throw new Error('O intervalo deve usar números inteiros maiores que zero')
  }
  if (
    range.start !== undefined
    && range.end !== undefined
    && range.end < range.start
  ) {
    throw new Error('O período final não pode anteceder o inicial')
  }
}

function filterByRange<T>(
  entries: readonly T[],
  selectIndex: (entry: T) => number,
  range: ScheduleRange,
): readonly T[] {
  assertValidRange(range)
  return entries.filter((entry) => {
    const value = selectIndex(entry)
    return (range.start === undefined || value >= range.start)
      && (range.end === undefined || value <= range.end)
  })
}

export function filterMonthlySchedule(
  schedule: readonly PriceScheduleEntry[],
  range: ScheduleRange,
): readonly PriceScheduleEntry[] {
  return filterByRange(schedule, (entry) => entry.period, range)
}

export function filterAnnualSchedule(
  schedule: readonly AnnualScheduleEntry[],
  range: ScheduleRange,
): readonly AnnualScheduleEntry[] {
  return filterByRange(schedule, (entry) => entry.year, range)
}

export function buildFinancingChartData(
  baseline: ComparedPriceScenario,
  scenario: ComparedPriceScenario,
): readonly FinancingChartEntry[] {
  const baselineByPeriod = new Map(
    baseline.schedule.map((entry) => [entry.period, entry]),
  )
  const scenarioByPeriod = new Map(
    scenario.schedule.map((entry) => [entry.period, entry]),
  )
  const lastPeriod = Math.max(
    baseline.schedule.at(-1)?.period ?? 0,
    scenario.schedule.at(-1)?.period ?? 0,
  )

  return Array.from({ length: lastPeriod }, (_, index) => {
    const period = index + 1
    const baselineEntry = baselineByPeriod.get(period)
    const scenarioEntry = scenarioByPeriod.get(period)
    return {
      period,
      baselineBalance: baselineEntry?.closingBalance,
      scenarioBalance: scenarioEntry?.closingBalance,
      baselinePayment: baselineEntry?.contractualPayment,
      scenarioPayment: scenarioEntry?.contractualPayment,
      interest: scenarioEntry?.interest,
      principal: scenarioEntry?.principalAmortizedByPayment,
      extraPayment: scenarioEntry?.extraPaymentApplied,
      periodicCharges: scenarioEntry?.periodicChargeTotal,
    }
  })
}

export function createMonthlyCsvData(
  schedule: readonly PriceScheduleEntry[],
  range: ScheduleRange,
): ScheduleCsvData {
  const entries = filterMonthlySchedule(schedule, range)
  return {
    headers: [
      'Período',
      'Saldo inicial',
      'Juros',
      'Prestação',
      'Amortização da parcela',
      'Aportes',
      'Cobranças',
      'Pagamento total',
      'Saldo final',
    ],
    rows: entries.map((entry) => [
      entry.period,
      entry.openingBalance,
      entry.interest,
      entry.contractualPayment,
      entry.principalAmortizedByPayment,
      entry.extraPaymentApplied,
      entry.periodicChargeTotal,
      entry.totalPayment,
      entry.closingBalance,
    ]),
  }
}

export function createAnnualCsvData(
  schedule: readonly AnnualScheduleEntry[],
  range: ScheduleRange,
): ScheduleCsvData {
  const entries = filterAnnualSchedule(schedule, range)
  return {
    headers: [
      'Ano',
      'Saldo inicial',
      'Juros',
      'Prestações',
      'Amortização da parcela',
      'Aportes',
      'Cobranças',
      'Pagamento total',
      'Saldo final',
    ],
    rows: entries.map((entry) => [
      entry.year,
      entry.openingBalance,
      entry.interest,
      entry.contractualPayment,
      entry.principalAmortizedByPayment,
      entry.extraPaymentApplied,
      entry.periodicChargeTotal,
      entry.totalPayment,
      entry.closingBalance,
    ]),
  }
}

function escapeCsvCell(value: string | number): string {
  if (typeof value === 'number') {
    return String(value).replace('.', ',')
  }
  return `"${value.replace(/"/g, '""')}"`
}

export function serializeCsv(data: ScheduleCsvData): string {
  return [data.headers, ...data.rows]
    .map((row) => row.map(escapeCsvCell).join(';'))
    .join('\r\n')
}
