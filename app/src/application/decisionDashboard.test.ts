import { describe, expect, it } from 'vitest'
import type {
  ExtraPaymentStrategy,
  PriceScheduleEntry,
} from '../domain/financing'
import type { Vehicle } from '../domain/vehicle'
import {
  createInitialAppState,
  setCandidateFinancing,
  setCurrentVehicle,
  addCandidate,
  type CandidateFinancingInput,
  type AppState,
} from './appState'
import {
  calculateDecisionDashboard,
  calculateDecisionDashboards,
  calculateMonthlyCashImpact,
} from './decisionDashboard'

const currentVehicle: Vehicle = {
  name: 'Nissan Tiida',
  powertrain: 'ICE',
  annualMileageKm: 12_000,
  vehicleValue: 40_000,
  annualDepreciationRate: 0.05,
  annualCosts: {
    insurance: 0,
    propertyTax: 0,
    licensing: 0,
    maintenance: 0,
  },
  fuel: {
    description: 'Gasolina',
    consumption: { unit: 'km/L', value: 10 },
    pricePerLiter: 5,
  },
}

function createOption(name = 'Dolphin Mini', pricePerKwh = 1): Vehicle {
  return {
    name,
    powertrain: 'BEV',
    annualMileageKm: 12_000,
    vehicleValue: 100_000,
    annualDepreciationRate: 0.05,
    annualCosts: {
      insurance: 0,
      propertyTax: 0,
      licensing: 0,
      maintenance: 0,
    },
    electricity: {
      consumptionKwhPer100Km: 20,
      pricePerKwh,
      chargingLossRate: 0,
    },
  }
}

function createState({
  option = createOption(),
  principal = 6_000,
  strategy = 'reducePayment',
  withFinancing = true,
  withExtraPayment = true,
  withCharge = false,
  extraPaymentAmount = 100,
  monthlyRate = 0,
  termMonths = 12,
  extraPaymentSchedule,
  periodicCharges,
}: {
  readonly option?: Vehicle
  readonly principal?: number
  readonly strategy?: ExtraPaymentStrategy
  readonly withFinancing?: boolean
  readonly withExtraPayment?: boolean
  readonly withCharge?: boolean
  readonly extraPaymentAmount?: number
  readonly monthlyRate?: number
  readonly termMonths?: number
  readonly extraPaymentSchedule?: CandidateFinancingInput['extraPaymentSchedule']
  readonly periodicCharges?: CandidateFinancingInput['periodicCharges']
} = {}): AppState {
  let state = setCurrentVehicle(
    createInitialAppState(),
    currentVehicle,
    'current',
  )
  state = addCandidate(state, option, 'option')
  if (!withFinancing) {
    return state
  }
  return setCandidateFinancing(state, 'option', {
    purchase: { manualAmount: principal },
    rate: { value: monthlyRate, periodicity: 'monthly' },
    termMonths,
    strategy,
    extraPaymentSchedule: extraPaymentSchedule ?? (withExtraPayment
      ? { oneTime: [{ amount: extraPaymentAmount, period: 1 }] }
      : undefined),
    periodicCharges: periodicCharges ?? (withCharge
      ? [{
          description: 'Tarifa',
          amount: 20,
          startPeriod: 1,
          frequencyMonths: 1,
        }]
      : undefined),
  })
}

function scheduleEntry({
  period,
  contractualPayment,
  extraPaymentApplied = 0,
  periodicChargeTotal = 0,
}: {
  readonly period: number
  readonly contractualPayment: number
  readonly extraPaymentApplied?: number
  readonly periodicChargeTotal?: number
}): PriceScheduleEntry {
  const totalPayment = contractualPayment
    + extraPaymentApplied
    + periodicChargeTotal
  return {
    period,
    openingBalance: 10_000,
    interest: 0,
    contractualPayment,
    principalAmortizedByPayment: contractualPayment,
    principalAmortizedByExtraPayment: extraPaymentApplied,
    extraPaymentApplied,
    periodicCharges: [],
    periodicChargeTotal,
    totalPayment,
    principalAmortized: contractualPayment + extraPaymentApplied,
    payment: contractualPayment,
    closingBalance: Math.max(0, 10_000 - contractualPayment - extraPaymentApplied),
  }
}

describe('Ciladômetro', () => {
  it('calcula economia quando a opção é mais barata operacionalmente', () => {
    const result = calculateDecisionDashboard(createState(), 'option')

    expect(result.operationalSavingsMonthly).toBe(300)
    expect(result.operationalSavingsAnnual).toBe(3_600)
    expect(result.comparison.candidate.vehicle.name).toBe('Dolphin Mini')
  })

  it('calcula custo adicional quando a opção é mais cara operacionalmente', () => {
    const result = calculateDecisionDashboard(createState({
      option: createOption('Elétrico caro', 3),
    }), 'option')

    expect(result.operationalSavingsMonthly).toBe(-100)
  })

  it('calcula impacto líquido mensal positivo', () => {
    const result = calculateDecisionDashboard(createState(), 'option')

    expect(result.selectedStrategy?.initialNetMonthlyImpact).toBe(300)
  })

  it('calcula impacto líquido mensal negativo', () => {
    const result = calculateDecisionDashboard(createState({
      principal: 1_200,
    }), 'option')

    expect(result.selectedStrategy?.initialNetMonthlyImpact).toBe(-100)
  })

  it('inclui cobranças periódicas no impacto mensal', () => {
    const result = calculateDecisionDashboard(createState({
      withCharge: true,
    }), 'option')

    expect(result.selectedStrategy?.firstPeriodPeriodicCharges).toBe(20)
    expect(result.selectedStrategy?.initialNetMonthlyImpact).toBe(320)
  })

  it('inclui aporte extraordinário aplicado no impacto real do primeiro período', () => {
    const withExtra = calculateDecisionDashboard(createState(), 'option')
    const withoutExtra = calculateDecisionDashboard(createState({
      withExtraPayment: false,
    }), 'option')

    expect(withExtra.selectedStrategy?.firstPeriodExtraPayment).toBe(100)
    expect(withExtra.selectedStrategy?.initialNetMonthlyImpact).toBe(
      (withoutExtra.selectedStrategy?.initialNetMonthlyImpact ?? 0) + 100,
    )
  })

  it('inclui aporte no desembolso líquido do primeiro período', () => {
    const result = calculateDecisionDashboard(createState(), 'option')

    expect(result.selectedStrategy?.firstPeriodNetDisbursementImpact).toBe(300)
  })

  it('calcula o custo mensal combinado inicial', () => {
    const result = calculateDecisionDashboard(createState(), 'option')

    expect(result.optionMonthlyCashTco).toBe(200)
    expect(result.selectedStrategy?.initialCombinedMonthlyCost).toBe(800)
    expect(result.currentMonthlyCashTco).toBe(500)
  })

  it('mantém somente a diferença operacional depois da quitação', () => {
    const result = calculateDecisionDashboard(createState(), 'option')

    expect(result.afterPayoffOperationalSavingsMonthly).toBe(300)
  })

  it('produz métricas para as três estratégias', () => {
    const result = calculateDecisionDashboard(createState(), 'option')

    expect(Object.keys(result.strategies ?? {})).toEqual([
      'none',
      'reducePayment',
      'reduceTerm',
    ])
  })

  it('identifica o menor total desembolsado', () => {
    const result = calculateDecisionDashboard(createState({
      extraPaymentAmount: 1_000,
      monthlyRate: 0.01,
    }), 'option')

    expect(result.highlights?.lowestTotalDisbursed).toEqual(['reduceTerm'])
  })

  it('identifica o menor total de juros', () => {
    const result = calculateDecisionDashboard(createState({
      extraPaymentAmount: 1_000,
      monthlyRate: 0.01,
    }), 'option')

    expect(result.highlights?.lowestInterest).toEqual(['reduceTerm'])
  })

  it('identifica o menor prazo efetivo', () => {
    const result = calculateDecisionDashboard(createState({
      extraPaymentAmount: 1_000,
      monthlyRate: 0.01,
    }), 'option')

    expect(result.highlights?.fastestPayoff).toEqual(['reduceTerm'])
  })

  it('preserva empates sem desempate arbitrário', () => {
    const result = calculateDecisionDashboard(createState({
      withExtraPayment: false,
    }), 'option')

    expect(result.highlights?.lowestTotalDisbursed).toEqual([
      'none',
      'reducePayment',
      'reduceTerm',
    ])
    expect(result.highlights?.fastestPayoff).toEqual([
      'none',
      'reducePayment',
      'reduceTerm',
    ])
  })

  it('calcula impacto médio mensal durante o financiamento', () => {
    const result = calculateDecisionDashboard(createState(), 'option')
    const metrics = result.selectedStrategy

    const expected = (metrics?.scenario.schedule ?? [])
      .reduce((total, period) => (
        total + period.totalPayment - result.operationalSavingsMonthly
      ), 0) / (metrics?.scenario.schedule.length ?? 1)
    expect(metrics?.averageMonthlyImpactDuringFinancing).toBeCloseTo(expected, 12)
  })

  it('destaca todas as estratégias com menor impacto médio no caixa', () => {
    const result = calculateDecisionDashboard(createState({
      extraPaymentAmount: 1_000,
      monthlyRate: 0.01,
    }), 'option')
    const strategies = result.strategies
    expect(strategies).not.toBeNull()
    if (strategies === null) {
      return
    }
    const minimum = Math.min(
      ...Object.values(strategies).map(
        (metrics) => metrics.averageMonthlyImpactDuringFinancing,
      ),
    )
    const expected = Object.values(strategies)
      .filter((metrics) => metrics.averageMonthlyImpactDuringFinancing === minimum)
      .map((metrics) => metrics.strategy)

    expect(result.highlights?.lowestCashImpact).toEqual(expected)
  })

  it('reconcilia literalmente prestação, aporte e economia operacional', () => {
    const summary = calculateMonthlyCashImpact([
      scheduleEntry({
        period: 1,
        contractualPayment: 2_482.42,
        extraPaymentApplied: 400,
      }),
    ], 1_588.37)

    expect(summary.firstPeriodImpact).toBeCloseTo(1_294.05, 10)
  })

  it('calcula prestação sem aporte menos economia operacional', () => {
    const summary = calculateMonthlyCashImpact([
      scheduleEntry({ period: 1, contractualPayment: 500 }),
    ], 300)

    expect(summary.firstPeriodImpact).toBe(200)
  })

  it('inclui aporte recorrente efetivamente aplicado no primeiro período', () => {
    const result = calculateDecisionDashboard(createState({
      extraPaymentSchedule: {
        recurring: { amount: 400, startPeriod: 1, frequencyMonths: 1 },
      },
    }), 'option')
    const metrics = result.selectedStrategy!

    expect(metrics.scenario.schedule[0].extraPaymentApplied).toBe(400)
    expect(metrics.firstPeriodNetDisbursementImpact).toBe(
      metrics.scenario.schedule[0].totalPayment - result.operationalSavingsMonthly,
    )
  })

  it('inclui recorrência iniciada no período 2 somente a partir dele', () => {
    const result = calculateDecisionDashboard(createState({
      extraPaymentSchedule: {
        recurring: { amount: 400, startPeriod: 2, frequencyMonths: 1 },
      },
    }), 'option')
    const metrics = result.selectedStrategy!

    expect(metrics.scenario.schedule[0].extraPaymentApplied).toBe(0)
    expect(metrics.scenario.schedule[1].extraPaymentApplied).toBe(400)
    expect(metrics.monthlyCashImpacts[0]).toBe(
      metrics.scenario.schedule[0].totalPayment - result.operationalSavingsMonthly,
    )
    expect(metrics.monthlyCashImpacts[1]).toBe(
      metrics.scenario.schedule[1].totalPayment - result.operationalSavingsMonthly,
    )
  })

  it('inclui aporte único somente no período configurado', () => {
    const result = calculateDecisionDashboard(createState({
      principal: 24_000,
      termMonths: 24,
      extraPaymentSchedule: {
        oneTime: [{ amount: 400, period: 12 }],
      },
    }), 'option')
    const metrics = result.selectedStrategy!

    expect(metrics.scenario.schedule[10].extraPaymentApplied).toBe(0)
    expect(metrics.scenario.schedule[11].extraPaymentApplied).toBe(400)
    expect(metrics.scenario.schedule[12].extraPaymentApplied).toBe(0)
  })

  it('inclui cobranças somente nos períodos aplicáveis', () => {
    const result = calculateDecisionDashboard(createState({
      withExtraPayment: false,
      periodicCharges: [{
        description: 'Tarifa bimestral',
        amount: 50,
        startPeriod: 2,
        endPeriod: 6,
        frequencyMonths: 2,
      }],
    }), 'option')
    const metrics = result.selectedStrategy!

    expect(metrics.scenario.schedule[0].periodicChargeTotal).toBe(0)
    expect(metrics.scenario.schedule[1].periodicChargeTotal).toBe(50)
    expect(metrics.scenario.schedule[2].periodicChargeTotal).toBe(0)
    expect(metrics.scenario.schedule[3].periodicChargeTotal).toBe(50)
  })

  it('acompanha as prestações recalculadas do reducePayment', () => {
    const result = calculateDecisionDashboard(createState({
      monthlyRate: 0.01,
      extraPaymentAmount: 1_000,
      strategy: 'reducePayment',
    }), 'option')
    const metrics = result.strategies!.reducePayment

    expect(metrics.scenario.schedule[1].contractualPayment).toBeLessThan(
      metrics.scenario.schedule[0].contractualPayment,
    )
    metrics.scenario.schedule.forEach((period, index) => {
      expect(metrics.monthlyCashImpacts[index]).toBeCloseTo(
        period.totalPayment - result.operationalSavingsMonthly,
        12,
      )
    })
  })

  it('encerra a série de impacto quando reduceTerm quita a dívida', () => {
    const result = calculateDecisionDashboard(createState({
      monthlyRate: 0.01,
      extraPaymentAmount: 2_000,
      strategy: 'reduceTerm',
    }), 'option')
    const metrics = result.strategies!.reduceTerm

    expect(metrics.monthlyCashImpacts).toHaveLength(
      metrics.scenario.effectiveTermMonths,
    )
    expect(metrics.scenario.effectiveTermMonths).toBeLessThan(
      result.strategies!.none.scenario.effectiveTermMonths,
    )
  })

  it('usa o aporte limitado ao saldo em vez do valor planejado', () => {
    const result = calculateDecisionDashboard(createState({
      principal: 1_200,
      extraPaymentAmount: 10_000,
    }), 'option')
    const metrics = result.selectedStrategy!
    const firstPeriod = metrics.scenario.schedule[0]

    expect(firstPeriod.extraPaymentApplied).toBe(1_100)
    expect(metrics.firstPeriodNetDisbursementImpact).toBe(
      firstPeriod.totalPayment - result.operationalSavingsMonthly,
    )
  })

  it('calcula média, maior e menor impacto a partir dos pagamentos reais', () => {
    const summary = calculateMonthlyCashImpact([
      scheduleEntry({ period: 1, contractualPayment: 500 }),
      scheduleEntry({ period: 2, contractualPayment: 400, extraPaymentApplied: 200 }),
      scheduleEntry({ period: 3, contractualPayment: 350 }),
    ], 100)

    expect(summary.impacts).toEqual([400, 500, 250])
    expect(summary.averageImpact).toBeCloseTo(1_150 / 3, 12)
    expect(summary.maximumImpact).toBe(500)
    expect(summary.minimumImpact).toBe(250)
  })

  it('calcula o impacto após quitação como o oposto da economia operacional', () => {
    expect(calculateMonthlyCashImpact([
      scheduleEntry({ period: 1, contractualPayment: 500 }),
    ], 300).afterPayoffImpact).toBe(-300)
  })

  it('aumenta corretamente o impacto quando a economia operacional é negativa', () => {
    const summary = calculateMonthlyCashImpact([
      scheduleEntry({ period: 1, contractualPayment: 500 }),
    ], -100)

    expect(summary.firstPeriodImpact).toBe(600)
    expect(summary.afterPayoffImpact).toBe(100)
  })

  it('preserva o baseline sem aporte usando o totalPayment do schedule', () => {
    const result = calculateDecisionDashboard(createState({
      withExtraPayment: false,
      strategy: 'none',
    }), 'option')
    const metrics = result.strategies!.none

    expect(metrics.firstPeriodExtraPayment).toBe(0)
    expect(metrics.firstPeriodNetDisbursementImpact).toBe(
      metrics.scenario.schedule[0].totalPayment - result.operationalSavingsMonthly,
    )
  })

  it.each(['none', 'reducePayment', 'reduceTerm'] as const)(
    'usa o schedule real da estratégia %s',
    (strategy) => {
      const result = calculateDecisionDashboard(createState({
        strategy,
        monthlyRate: 0.01,
        extraPaymentAmount: 500,
      }), 'option')
      const metrics = result.strategies![strategy]

      expect(metrics.firstPeriodNetDisbursementImpact).toBeCloseTo(
        metrics.scenario.schedule[0].totalPayment
          - result.operationalSavingsMonthly,
        12,
      )
    },
  )

  it('não produz NaN ou Infinity para cronograma válido', () => {
    const result = calculateDecisionDashboard(createState({
      monthlyRate: 0,
      withExtraPayment: false,
    }), 'option')

    Object.values(result.strategies!).forEach((metrics) => {
      expect(metrics.monthlyCashImpacts.every(Number.isFinite)).toBe(true)
      expect(Number.isFinite(metrics.averageMonthlyImpactDuringFinancing)).toBe(true)
      expect(Number.isFinite(metrics.maximumMonthlyImpactDuringFinancing)).toBe(true)
      expect(Number.isFinite(metrics.minimumMonthlyImpactDuringFinancing)).toBe(true)
      expect(Number.isFinite(metrics.afterPayoffMonthlyImpact)).toBe(true)
    })
  })

  it('calcula o resumo mensal sem modificar o schedule recebido', () => {
    const schedule = [
      scheduleEntry({ period: 1, contractualPayment: 500 }),
      scheduleEntry({ period: 2, contractualPayment: 400, extraPaymentApplied: 100 }),
    ]
    const before = structuredClone(schedule)

    const first = calculateMonthlyCashImpact(schedule, 200)
    const second = calculateMonthlyCashImpact(schedule, 200)

    expect(first).toEqual(second)
    expect(schedule).toEqual(before)
  })

  it('retorna comparação sem inventar financiamento ausente', () => {
    const result = calculateDecisionDashboard(createState({
      withFinancing: false,
    }), 'option')

    expect(result.financing).toBeNull()
    expect(result.strategies).toBeNull()
    expect(result.operationalSavingsMonthly).toBe(300)
  })

  it('é determinístico', () => {
    const state = createState()

    expect(calculateDecisionDashboard(state, 'option')).toEqual(
      calculateDecisionDashboard(state, 'option'),
    )
  })

  it('não modifica o estado de entrada', () => {
    const state = createState()
    const before = structuredClone(state)

    calculateDecisionDashboard(state, 'option')

    expect(state).toEqual(before)
  })

  it('calcula duas opções e seus cronogramas independentemente', () => {
    let state = createState()
    state = addCandidate(state, createOption('Opção B', 2), 'option-b')
    state = setCandidateFinancing(state, 'option-b', {
      purchase: { manualAmount: 12_000 },
      rate: { value: 0, periodicity: 'monthly' },
      termMonths: 12,
      strategy: 'reduceTerm',
      extraPaymentSchedule: { oneTime: [{ amount: 2_000, period: 1 }] },
    })

    const results = calculateDecisionDashboards(state, ['option', 'option-b'])

    expect(results.map((result) => result.comparison.candidate.vehicle.name)).toEqual([
      'Dolphin Mini',
      'Opção B',
    ])
    expect(results[0].selectedStrategy?.scenario.schedule).not.toEqual(
      results[1].selectedStrategy?.scenario.schedule,
    )
  })

  it('mantém a análise financiada quando a outra opção não tem financiamento', () => {
    let state = createState()
    state = addCandidate(state, createOption('Sem financiamento', 2), 'option-b')

    const results = calculateDecisionDashboards(state, ['option', 'option-b'])

    expect(results[0].financing).not.toBeNull()
    expect(results[1].financing).toBeNull()
    expect(results[1].operationalSavingsMonthly).toBeDefined()
  })
})
