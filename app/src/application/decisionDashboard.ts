import type {
  ComparedPriceScenario,
  ExtraPaymentStrategy,
  PriceScheduleEntry,
} from '../domain/financing'
import {
  AppStateError,
  calculateCandidateFinancing,
  calculateSelectedVehicleComparison,
  type AppState,
  type CandidateFinancingResult,
  type IntegratedVehicleComparison,
} from './appState'

export const decisionStrategyOrder = [
  'none',
  'reducePayment',
  'reduceTerm',
] as const satisfies readonly ExtraPaymentStrategy[]

export interface DecisionStrategyMetrics {
  readonly strategy: ExtraPaymentStrategy
  readonly scenario: ComparedPriceScenario
  readonly firstPeriodContractualPayment: number
  readonly firstPeriodPeriodicCharges: number
  readonly firstPeriodExtraPayment: number
  readonly firstPeriodTotalPayment: number
  readonly initialNetMonthlyImpact: number
  readonly initialCombinedMonthlyCost: number
  readonly firstPeriodNetDisbursementImpact: number
  readonly monthlyCashImpacts: readonly number[]
  readonly averageMonthlyImpactDuringFinancing: number
  readonly maximumMonthlyImpactDuringFinancing: number
  readonly minimumMonthlyImpactDuringFinancing: number
  readonly afterPayoffMonthlyImpact: number
  readonly analysisHorizonMonths: number
  readonly horizonCashImpacts: readonly number[]
  readonly cumulativeCashImpact: number
  readonly averageMonthlyImpactDuringHorizon: number
  readonly maximumMonthlyImpactDuringHorizon: number
  readonly minimumMonthlyImpactDuringHorizon: number
}

export interface MonthlyCashImpactSummary {
  readonly impacts: readonly number[]
  readonly firstPeriodImpact: number
  readonly averageImpact: number
  readonly maximumImpact: number
  readonly minimumImpact: number
  readonly afterPayoffImpact: number
}

export interface HorizonCashImpactSummary {
  readonly horizonMonths: number
  readonly impacts: readonly number[]
  readonly firstPeriodImpact: number
  readonly cumulativeImpact: number
  readonly averageImpact: number
  readonly maximumImpact: number
  readonly minimumImpact: number
  readonly afterPayoffImpact: number
}

export interface DecisionHighlights {
  readonly lowestCashImpact: readonly ExtraPaymentStrategy[]
  readonly lowestTotalDisbursed: readonly ExtraPaymentStrategy[]
  readonly fastestPayoff: readonly ExtraPaymentStrategy[]
  readonly lowestInterest: readonly ExtraPaymentStrategy[]
}

export interface DecisionDashboardResult {
  readonly comparison: IntegratedVehicleComparison
  readonly currentMonthlyCashTco: number
  readonly optionMonthlyCashTco: number
  readonly operationalSavingsMonthly: number
  readonly operationalSavingsAnnual: number
  readonly operationalSavingsPerKm: number
  readonly afterPayoffOperationalSavingsMonthly: number
  readonly financing: CandidateFinancingResult | null
  readonly strategies: Readonly<
    Record<ExtraPaymentStrategy, DecisionStrategyMetrics>
  > | null
  readonly selectedStrategy: DecisionStrategyMetrics | null
  readonly recommendedStrategies: readonly ExtraPaymentStrategy[] | null
  readonly recommendedStrategy: DecisionStrategyMetrics | null
  readonly highlights: DecisionHighlights | null
}

export interface ComparedDecisionOption {
  readonly result: DecisionDashboardResult
  readonly commonHorizonCashImpact: HorizonCashImpactSummary | null
}

export interface DecisionOptionsComparison {
  readonly options: readonly ComparedDecisionOption[]
  readonly comparisonHorizonMonths: number | null
  readonly lowestTotalImpactOptionIds: readonly string[] | null
  readonly lowestFirstPeriodImpactOptionIds: readonly string[] | null
  readonly totalImpactDifference: number | null
  readonly firstPeriodImpactDifference: number | null
}

function calculateStrategyMetrics(
  scenario: ComparedPriceScenario,
  optionMonthlyCashTco: number,
  operationalSavingsMonthly: number,
): DecisionStrategyMetrics {
  const firstPeriod = scenario.schedule[0]
  if (firstPeriod === undefined) {
    throw new AppStateError('cronograma de financiamento vazio')
  }

  const cashImpact = calculateMonthlyCashImpact(
    scenario.schedule,
    operationalSavingsMonthly,
  )
  const horizonImpact = calculateCashImpactOverHorizon(
    scenario.schedule,
    operationalSavingsMonthly,
    scenario.originalTermMonths,
  )

  return {
    strategy: scenario.strategy,
    scenario,
    firstPeriodContractualPayment: firstPeriod.contractualPayment,
    firstPeriodPeriodicCharges: firstPeriod.periodicChargeTotal,
    firstPeriodExtraPayment: firstPeriod.extraPaymentApplied,
    firstPeriodTotalPayment: firstPeriod.totalPayment,
    initialNetMonthlyImpact: cashImpact.firstPeriodImpact,
    initialCombinedMonthlyCost: optionMonthlyCashTco
      + firstPeriod.totalPayment,
    firstPeriodNetDisbursementImpact: cashImpact.firstPeriodImpact,
    monthlyCashImpacts: cashImpact.impacts,
    averageMonthlyImpactDuringFinancing: cashImpact.averageImpact,
    maximumMonthlyImpactDuringFinancing: cashImpact.maximumImpact,
    minimumMonthlyImpactDuringFinancing: cashImpact.minimumImpact,
    afterPayoffMonthlyImpact: cashImpact.afterPayoffImpact,
    analysisHorizonMonths: horizonImpact.horizonMonths,
    horizonCashImpacts: horizonImpact.impacts,
    cumulativeCashImpact: horizonImpact.cumulativeImpact,
    averageMonthlyImpactDuringHorizon: horizonImpact.averageImpact,
    maximumMonthlyImpactDuringHorizon: horizonImpact.maximumImpact,
    minimumMonthlyImpactDuringHorizon: horizonImpact.minimumImpact,
  }
}

export function calculateMonthlyCashImpact(
  schedule: readonly PriceScheduleEntry[],
  operationalSavingsMonthly: number,
): MonthlyCashImpactSummary {
  if (!Number.isFinite(operationalSavingsMonthly)) {
    throw new AppStateError('economia operacional mensal inválida')
  }
  if (schedule.length === 0) {
    throw new AppStateError('cronograma de financiamento vazio')
  }

  const impacts = schedule.map((period) => {
    if (!Number.isFinite(period.totalPayment)) {
      throw new AppStateError('pagamento total do período inválido')
    }
    return period.totalPayment - operationalSavingsMonthly
  })
  const total = impacts.reduce((sum, impact) => sum + impact, 0)

  return {
    impacts,
    firstPeriodImpact: impacts[0],
    averageImpact: total / impacts.length,
    maximumImpact: Math.max(...impacts),
    minimumImpact: Math.min(...impacts),
    afterPayoffImpact: -operationalSavingsMonthly,
  }
}

export function calculateCashImpactOverHorizon(
  schedule: readonly PriceScheduleEntry[],
  operationalSavingsMonthly: number,
  horizonMonths: number,
): HorizonCashImpactSummary {
  if (!Number.isFinite(operationalSavingsMonthly)) {
    throw new AppStateError('economia operacional mensal inválida')
  }
  if (!Number.isInteger(horizonMonths) || horizonMonths <= 0) {
    throw new AppStateError('horizonte de comparação inválido')
  }

  const paymentsByPeriod = new Map<number, number>()
  schedule.forEach((period) => {
    if (!Number.isInteger(period.period) || period.period <= 0) {
      throw new AppStateError('período do cronograma inválido')
    }
    if (!Number.isFinite(period.totalPayment)) {
      throw new AppStateError('pagamento total do período inválido')
    }
    paymentsByPeriod.set(period.period, period.totalPayment)
  })
  const impacts = Array.from({ length: horizonMonths }, (_, index) => (
    (paymentsByPeriod.get(index + 1) ?? 0) - operationalSavingsMonthly
  ))
  const cumulativeImpact = impacts.reduce((sum, impact) => sum + impact, 0)

  return {
    horizonMonths,
    impacts,
    firstPeriodImpact: impacts[0],
    cumulativeImpact,
    averageImpact: cumulativeImpact / horizonMonths,
    maximumImpact: Math.max(...impacts),
    minimumImpact: Math.min(...impacts),
    afterPayoffImpact: -operationalSavingsMonthly,
  }
}

function numericalTolerance(values: readonly number[]): number {
  const magnitude = Math.max(1, ...values.map(Math.abs))
  return Number.EPSILON * magnitude * 64
}

export function selectRecommendedStrategies(
  cumulativeImpacts: Readonly<Record<ExtraPaymentStrategy, number>>,
): readonly ExtraPaymentStrategy[] {
  const values = decisionStrategyOrder.map(
    (strategy) => cumulativeImpacts[strategy],
  )
  if (values.some((value) => !Number.isFinite(value))) {
    throw new AppStateError('impacto acumulado de estratégia inválido')
  }
  const minimum = Math.min(...values)
  const tolerance = numericalTolerance(values)
  return decisionStrategyOrder.filter(
    (strategy) => cumulativeImpacts[strategy] - minimum <= tolerance,
  )
}

function selectMinimumOptionIds(
  options: readonly ComparedDecisionOption[],
  selectValue: (option: ComparedDecisionOption) => number,
): readonly string[] {
  const values = options.map(selectValue)
  const minimum = Math.min(...values)
  const tolerance = numericalTolerance(values)
  return options
    .filter((option) => selectValue(option) - minimum <= tolerance)
    .map((option) => option.result.comparison.candidate.id)
}

function selectMinimumStrategies(
  strategies: Readonly<Record<ExtraPaymentStrategy, DecisionStrategyMetrics>>,
  selectValue: (metrics: DecisionStrategyMetrics) => number,
): readonly ExtraPaymentStrategy[] {
  const minimum = Math.min(
    ...decisionStrategyOrder.map((strategy) => selectValue(strategies[strategy])),
  )
  return decisionStrategyOrder.filter(
    (strategy) => selectValue(strategies[strategy]) === minimum,
  )
}

export function calculateDecisionDashboard(
  state: AppState,
  optionId: string,
): DecisionDashboardResult {
  const comparison = calculateSelectedVehicleComparison({
    ...state,
    selectedComparisonCandidateId: optionId,
  })
  const currentMonthlyCashTco = comparison.currentTco.cashTco.monthly
  const optionMonthlyCashTco = comparison.candidateTco.cashTco.monthly
  const operationalSavingsMonthly = comparison.operationalSavings.monthly
  const baseResult = {
    comparison,
    currentMonthlyCashTco,
    optionMonthlyCashTco,
    operationalSavingsMonthly,
    operationalSavingsAnnual: comparison.operationalSavings.annual,
    operationalSavingsPerKm: comparison.operationalSavings.perKm,
    afterPayoffOperationalSavingsMonthly: operationalSavingsMonthly,
  }

  if (state.financingByCandidateId[optionId] === undefined) {
    return {
      ...baseResult,
      financing: null,
      strategies: null,
      selectedStrategy: null,
      recommendedStrategies: null,
      recommendedStrategy: null,
      highlights: null,
    }
  }

  const financing = calculateCandidateFinancing(state, optionId)
  const strategies = {
    none: calculateStrategyMetrics(
      financing.comparison.none,
      optionMonthlyCashTco,
      operationalSavingsMonthly,
    ),
    reducePayment: calculateStrategyMetrics(
      financing.comparison.reducePayment,
      optionMonthlyCashTco,
      operationalSavingsMonthly,
    ),
    reduceTerm: calculateStrategyMetrics(
      financing.comparison.reduceTerm,
      optionMonthlyCashTco,
      operationalSavingsMonthly,
    ),
  }
  const selectedStrategy = strategies[
    state.financingByCandidateId[optionId].strategy
  ]
  const recommendedStrategies = selectRecommendedStrategies({
    none: strategies.none.cumulativeCashImpact,
    reducePayment: strategies.reducePayment.cumulativeCashImpact,
    reduceTerm: strategies.reduceTerm.cumulativeCashImpact,
  })

  return {
    ...baseResult,
    financing,
    strategies,
    selectedStrategy,
    recommendedStrategies,
    recommendedStrategy: strategies[recommendedStrategies[0]],
    highlights: {
      lowestCashImpact: selectMinimumStrategies(
        strategies,
        (metrics) => metrics.averageMonthlyImpactDuringFinancing,
      ),
      lowestTotalDisbursed: selectMinimumStrategies(
        strategies,
        (metrics) => metrics.scenario.totalDisbursed,
      ),
      fastestPayoff: selectMinimumStrategies(
        strategies,
        (metrics) => metrics.scenario.effectiveTermMonths,
      ),
      lowestInterest: selectMinimumStrategies(
        strategies,
        (metrics) => metrics.scenario.totalInterest,
      ),
    },
  }
}

export function calculateDecisionDashboards(
  state: AppState,
  optionIds: readonly string[],
): readonly DecisionDashboardResult[] {
  return optionIds.map((optionId) => calculateDecisionDashboard(state, optionId))
}

export function calculateDecisionOptionsComparison(
  state: AppState,
  optionIds: readonly string[],
): DecisionOptionsComparison {
  const results = calculateDecisionDashboards(state, optionIds)
  const financedResults = results.filter(
    (result) => result.recommendedStrategy !== null,
  )
  const allOptionsFinanced = financedResults.length === results.length
    && results.length > 0
  const comparisonHorizonMonths = allOptionsFinanced
    ? Math.max(...financedResults.map(
        (result) => result.recommendedStrategy!.scenario.originalTermMonths,
      ))
    : null
  const options = results.map((result): ComparedDecisionOption => {
    if (result.recommendedStrategy === null) {
      return {
        result,
        commonHorizonCashImpact: null,
      }
    }
    const horizonMonths = comparisonHorizonMonths
      ?? result.recommendedStrategy.scenario.originalTermMonths
    return {
      result,
      commonHorizonCashImpact: calculateCashImpactOverHorizon(
        result.recommendedStrategy.scenario.schedule,
        result.operationalSavingsMonthly,
        horizonMonths,
      ),
    }
  })
  if (comparisonHorizonMonths === null) {
    return {
      options,
      comparisonHorizonMonths: null,
      lowestTotalImpactOptionIds: null,
      lowestFirstPeriodImpactOptionIds: null,
      totalImpactDifference: null,
      firstPeriodImpactDifference: null,
    }
  }

  const lowestTotalImpactOptionIds = selectMinimumOptionIds(
    options,
    (option) => option.commonHorizonCashImpact!.cumulativeImpact,
  )
  const lowestFirstPeriodImpactOptionIds = selectMinimumOptionIds(
    options,
    (option) => option.commonHorizonCashImpact!.firstPeriodImpact,
  )
  const sortedTotals = options
    .map((option) => option.commonHorizonCashImpact!.cumulativeImpact)
    .sort((left, right) => left - right)
  const sortedFirstPeriods = options
    .map((option) => option.commonHorizonCashImpact!.firstPeriodImpact)
    .sort((left, right) => left - right)

  return {
    options,
    comparisonHorizonMonths,
    lowestTotalImpactOptionIds,
    lowestFirstPeriodImpactOptionIds,
    totalImpactDifference: sortedTotals.length > 1
      ? sortedTotals[1] - sortedTotals[0]
      : 0,
    firstPeriodImpactDifference: sortedFirstPeriods.length > 1
      ? sortedFirstPeriods[1] - sortedFirstPeriods[0]
      : 0,
  }
}
