import type {
  ComparedPriceScenario,
  ExtraPaymentStrategy,
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
  readonly averageMonthlyImpactDuringFinancing: number
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
  readonly highlights: DecisionHighlights | null
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

  const recurringFinancingDisbursement = firstPeriod.contractualPayment
    + firstPeriod.periodicChargeTotal

  return {
    strategy: scenario.strategy,
    scenario,
    firstPeriodContractualPayment: firstPeriod.contractualPayment,
    firstPeriodPeriodicCharges: firstPeriod.periodicChargeTotal,
    firstPeriodExtraPayment: firstPeriod.extraPaymentApplied,
    firstPeriodTotalPayment: firstPeriod.totalPayment,
    initialNetMonthlyImpact: recurringFinancingDisbursement
      - operationalSavingsMonthly,
    initialCombinedMonthlyCost: optionMonthlyCashTco
      + recurringFinancingDisbursement,
    firstPeriodNetDisbursementImpact: firstPeriod.totalPayment
      - operationalSavingsMonthly,
    averageMonthlyImpactDuringFinancing:
      scenario.totalDisbursed / scenario.effectiveTermMonths
      - operationalSavingsMonthly,
  }
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

  return {
    ...baseResult,
    financing,
    strategies,
    selectedStrategy,
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
