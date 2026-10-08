import { describe, expect, it } from 'vitest'
import { comparePriceStrategies } from '../domain/financing'
import {
  aggregateScheduleAnnually,
  buildFinancingChartData,
  calculateAmortizationImpact,
  createAnnualCsvData,
  createMonthlyCsvData,
  filterAnnualSchedule,
  filterMonthlySchedule,
  getStrategyScenario,
  serializeCsv,
} from './financingLab'

function createComparison({
  principal = 24_000,
  termMonths = 24,
  rate = 0.01,
  oneTime = [{ amount: 2_000, period: 3 }],
  recurring,
}: {
  readonly principal?: number
  readonly termMonths?: number
  readonly rate?: number
  readonly oneTime?: readonly { readonly amount: number; readonly period: number }[]
  readonly recurring?: {
    readonly amount: number
    readonly startPeriod: number
    readonly endPeriod?: number
    readonly frequencyMonths: number
  }
} = {}) {
  return comparePriceStrategies({
    principal,
    termMonths,
    rate: { value: rate, periodicity: 'monthly' },
    extraPaymentSchedule: oneTime.length > 0 || recurring !== undefined
      ? { oneTime, recurring }
      : undefined,
    periodicCharges: [{
      description: 'Tarifa',
      amount: 10,
      startPeriod: 1,
      frequencyMonths: 1,
    }],
  })
}

describe('laboratório do financiamento', () => {
  it('mede o impacto de um aporte único isolado', () => {
    const comparison = createComparison()
    const impact = calculateAmortizationImpact(
      comparison.none,
      comparison.reduceTerm,
    )
    expect(impact.totalExtraPayments).toBeCloseTo(2_000, 10)
    expect(impact.interestSavings).toBeGreaterThan(0)
  })

  it('mede um aporte recorrente isolado', () => {
    const comparison = createComparison({
      oneTime: [],
      recurring: { amount: 100, startPeriod: 2, frequencyMonths: 2 },
    })
    expect(comparison.reducePayment.totalExtraPayments).toBeGreaterThan(0)
  })

  it('combina aporte único e recorrente', () => {
    const comparison = createComparison({
      recurring: { amount: 100, startPeriod: 2, endPeriod: 6, frequencyMonths: 2 },
    })
    expect(comparison.reduceTerm.totalExtraPayments).toBeCloseTo(2_300, 10)
  })

  it('combina múltiplos aportes únicos e recorrente', () => {
    const comparison = createComparison({
      oneTime: [
        { amount: 1_000, period: 3 },
        { amount: 500, period: 5 },
      ],
      recurring: { amount: 100, startPeriod: 2, endPeriod: 6, frequencyMonths: 2 },
    })
    expect(comparison.reducePayment.totalExtraPayments).toBeCloseTo(1_800, 10)
  })

  it('calcula a economia de juros contra o baseline', () => {
    const comparison = createComparison()
    const impact = calculateAmortizationImpact(
      comparison.none,
      comparison.reduceTerm,
    )
    expect(impact.interestSavings).toBeCloseTo(
      comparison.none.totalInterest - comparison.reduceTerm.totalInterest,
      12,
    )
  })

  it('calcula o percentual de economia de juros', () => {
    const comparison = createComparison()
    const impact = calculateAmortizationImpact(
      comparison.none,
      comparison.reduceTerm,
    )
    expect(impact.interestSavingsPercentage).toBeCloseTo(
      impact.interestSavings / comparison.none.totalInterest,
      12,
    )
  })

  it('calcula a diferença do total desembolsado', () => {
    const comparison = createComparison()
    const impact = calculateAmortizationImpact(
      comparison.none,
      comparison.reduceTerm,
    )
    expect(impact.totalDisbursedSavings).toBeCloseTo(
      comparison.none.totalDisbursed - comparison.reduceTerm.totalDisbursed,
      12,
    )
  })

  it('calcula a redução efetiva do prazo', () => {
    const comparison = createComparison()
    const impact = calculateAmortizationImpact(
      comparison.none,
      comparison.reduceTerm,
    )
    expect(impact.monthsSaved).toBeGreaterThan(0)
  })

  it('preserva o prazo no reducePayment quando não há quitação antecipada', () => {
    const comparison = createComparison({
      principal: 100_000,
      oneTime: [{ amount: 100, period: 2 }],
    })
    expect(comparison.reducePayment.effectiveTermMonths).toBe(
      comparison.none.effectiveTermMonths,
    )
  })

  it('antecipa a quitação no reduceTerm', () => {
    const comparison = createComparison()
    expect(comparison.reduceTerm.payoffPeriod).toBeLessThan(
      comparison.none.payoffPeriod,
    )
  })

  it('mantém métricas zeradas em cenário sem aportes', () => {
    const comparison = createComparison({ oneTime: [] })
    const impact = calculateAmortizationImpact(
      comparison.none,
      comparison.reducePayment,
    )
    expect(impact).toMatchObject({
      interestSavings: 0,
      totalDisbursedSavings: 0,
      monthsSaved: 0,
      totalExtraPayments: 0,
    })
  })

  it('agrega os primeiros 12 períodos no ano 1', () => {
    const comparison = createComparison({ oneTime: [] })
    const annual = aggregateScheduleAnnually(comparison.none.schedule)
    expect(annual[0].year).toBe(1)
    expect(annual).toHaveLength(2)
  })

  it('agrega um último ano com menos de 12 períodos', () => {
    const comparison = createComparison({ termMonths: 14, oneTime: [] })
    const annual = aggregateScheduleAnnually(comparison.none.schedule)
    expect(annual).toHaveLength(2)
    expect(annual[1].contractualPayment).toBeCloseTo(
      comparison.none.schedule.slice(12).reduce(
        (total, entry) => total + entry.contractualPayment,
        0,
      ),
      12,
    )
  })

  it('preserva saldos inicial e final na agregação', () => {
    const comparison = createComparison({ oneTime: [] })
    const annual = aggregateScheduleAnnually(comparison.none.schedule)
    expect(annual[0].openingBalance).toBe(
      comparison.none.schedule[0].openingBalance,
    )
    expect(annual[0].closingBalance).toBe(
      comparison.none.schedule[11].closingBalance,
    )
  })

  it('soma corretamente as colunas anuais', () => {
    const comparison = createComparison()
    const annual = aggregateScheduleAnnually(comparison.reduceTerm.schedule)
    expect(annual.reduce((total, year) => total + year.interest, 0)).toBeCloseTo(
      comparison.reduceTerm.totalInterest,
      10,
    )
    expect(annual.reduce((total, year) => total + year.totalPayment, 0)).toBeCloseTo(
      comparison.reduceTerm.totalDisbursed,
      10,
    )
  })

  it('filtra períodos mensais de forma inclusiva', () => {
    const comparison = createComparison({ oneTime: [] })
    const filtered = filterMonthlySchedule(
      comparison.none.schedule,
      { start: 3, end: 5 },
    )
    expect(filtered.map((entry) => entry.period)).toEqual([3, 4, 5])
  })

  it('filtra anos de forma inclusiva', () => {
    const comparison = createComparison({ termMonths: 30, oneTime: [] })
    const annual = aggregateScheduleAnnually(comparison.none.schedule)
    expect(filterAnnualSchedule(annual, { start: 2, end: 2 })).toEqual([
      annual[1],
    ])
  })

  it('gera dados mensais de CSV com números crus', () => {
    const comparison = createComparison({ oneTime: [] })
    const data = createMonthlyCsvData(comparison.none.schedule, { end: 1 })
    expect(data.headers[0]).toBe('Período')
    expect(data.rows[0][1]).toBe(comparison.none.schedule[0].openingBalance)
  })

  it('gera dados anuais de CSV', () => {
    const comparison = createComparison({ oneTime: [] })
    const annual = aggregateScheduleAnnually(comparison.none.schedule)
    const data = createAnnualCsvData(annual, {})
    expect(data.headers[0]).toBe('Ano')
    expect(data.rows).toHaveLength(2)
  })

  it('reflete o filtro no CSV serializado', () => {
    const comparison = createComparison({ oneTime: [] })
    const csv = serializeCsv(createMonthlyCsvData(
      comparison.none.schedule,
      { start: 2, end: 2 },
    ))
    expect(csv.split('\r\n')).toHaveLength(2)
    expect(csv).toContain('\r\n2;')
  })

  it('mantém baseline separado do cenário com amortização', () => {
    const comparison = createComparison()
    const chart = buildFinancingChartData(
      comparison.none,
      comparison.reduceTerm,
    )
    expect(chart[2].baselineBalance).not.toBe(chart[2].scenarioBalance)
  })

  it('produz gráficos diretamente dos schedules existentes', () => {
    const comparison = createComparison()
    const chart = buildFinancingChartData(
      comparison.none,
      comparison.reducePayment,
    )
    expect(chart[0]).toMatchObject({
      baselineBalance: comparison.none.schedule[0].closingBalance,
      scenarioBalance: comparison.reducePayment.schedule[0].closingBalance,
      scenarioPayment: comparison.reducePayment.schedule[0].contractualPayment,
      interest: comparison.reducePayment.schedule[0].interest,
      principal:
        comparison.reducePayment.schedule[0].principalAmortizedByPayment,
      extraPayment: comparison.reducePayment.schedule[0].extraPaymentApplied,
    })
  })

  it('evita NaN e Infinity quando os juros do baseline são zero', () => {
    const comparison = createComparison({ rate: 0 })
    const impact = calculateAmortizationImpact(
      comparison.none,
      comparison.reduceTerm,
    )
    expect(impact.interestSavingsPercentage).toBe(0)
    expect(Number.isFinite(impact.totalDisbursedSavings)).toBe(true)
  })

  it('é determinístico', () => {
    const comparison = createComparison()
    expect(calculateAmortizationImpact(
      comparison.none,
      comparison.reduceTerm,
    )).toEqual(calculateAmortizationImpact(
      comparison.none,
      comparison.reduceTerm,
    ))
  })

  it('não modifica schedules de entrada', () => {
    const comparison = createComparison()
    const before = structuredClone(comparison)
    aggregateScheduleAnnually(comparison.reduceTerm.schedule)
    buildFinancingChartData(comparison.none, comparison.reduceTerm)
    createMonthlyCsvData(comparison.reduceTerm.schedule, { start: 2 })
    expect(comparison).toEqual(before)
  })

  it('disponibiliza as três estratégias simultaneamente', () => {
    const comparison = createComparison()
    expect(['none', 'reducePayment', 'reduceTerm'].map(
      (strategy) => getStrategyScenario(comparison, strategy as keyof typeof comparison).strategy,
    )).toEqual(['none', 'reducePayment', 'reduceTerm'])
  })

  it('retorna zeros explícitos para o baseline', () => {
    const comparison = createComparison()
    expect(calculateAmortizationImpact(
      comparison.none,
      comparison.none,
    )).toMatchObject({
      interestSavings: 0,
      interestSavingsPercentage: 0,
      totalDisbursedSavings: 0,
      monthsSaved: 0,
      totalExtraPayments: 0,
    })
  })

  it('discrimina aportes aplicados em cada estratégia', () => {
    const comparison = createComparison()
    expect(comparison.none.totalExtraPayments).toBe(0)
    expect(comparison.reducePayment.totalExtraPayments).toBeCloseTo(2_000, 10)
    expect(comparison.reduceTerm.totalExtraPayments).toBeCloseTo(2_000, 10)
  })

  it('selecionar uma estratégia para visualização não modifica a comparação', () => {
    const comparison = createComparison()
    const before = structuredClone(comparison)
    getStrategyScenario(comparison, 'reducePayment')
    getStrategyScenario(comparison, 'reduceTerm')
    expect(comparison).toEqual(before)
  })

  it('expõe o schedule correspondente a cada estratégia', () => {
    const comparison = createComparison()
    expect(getStrategyScenario(comparison, 'none').schedule).toBe(
      comparison.none.schedule,
    )
    expect(getStrategyScenario(comparison, 'reducePayment').schedule).toBe(
      comparison.reducePayment.schedule,
    )
    expect(getStrategyScenario(comparison, 'reduceTerm').schedule).toBe(
      comparison.reduceTerm.schedule,
    )
  })

  it('usa Amortização da parcela no cabeçalho mensal e anual do CSV', () => {
    const comparison = createComparison()
    expect(createMonthlyCsvData(comparison.none.schedule, {}).headers).toContain(
      'Amortização da parcela',
    )
    expect(createAnnualCsvData(
      aggregateScheduleAnnually(comparison.none.schedule),
      {},
    ).headers).toContain('Amortização da parcela')
  })

  it('gera o CSV a partir do cenário explicitamente escolhido', () => {
    const comparison = createComparison()
    const baseline = createMonthlyCsvData(
      getStrategyScenario(comparison, 'none').schedule,
      { start: 3, end: 3 },
    )
    const reduceTerm = createMonthlyCsvData(
      getStrategyScenario(comparison, 'reduceTerm').schedule,
      { start: 3, end: 3 },
    )
    expect(baseline.rows[0][5]).toBe(0)
    expect(reduceTerm.rows[0][5]).toBeCloseTo(2_000, 10)
  })

  it('não conta aportes duas vezes no total desembolsado', () => {
    const comparison = createComparison()
    const scenario = comparison.reduceTerm
    expect(scenario.schedule.reduce(
      (total, entry) => total + entry.totalPayment,
      0,
    )).toBeCloseTo(scenario.totalDisbursed, 10)
  })
})
