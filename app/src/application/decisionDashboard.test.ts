import { describe, expect, it } from 'vitest'
import type { ExtraPaymentStrategy } from '../domain/financing'
import type { Vehicle } from '../domain/vehicle'
import {
  createInitialAppState,
  setCandidateFinancing,
  setCurrentVehicle,
  addCandidate,
  type AppState,
} from './appState'
import { calculateDecisionDashboard } from './decisionDashboard'

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
}: {
  readonly option?: Vehicle
  readonly principal?: number
  readonly strategy?: ExtraPaymentStrategy
  readonly withFinancing?: boolean
  readonly withExtraPayment?: boolean
  readonly withCharge?: boolean
  readonly extraPaymentAmount?: number
  readonly monthlyRate?: number
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
    termMonths: 12,
    strategy,
    extraPaymentSchedule: withExtraPayment
      ? { oneTime: [{ amount: extraPaymentAmount, period: 1 }] }
      : undefined,
    periodicCharges: withCharge
      ? [{
          description: 'Tarifa',
          amount: 20,
          startPeriod: 1,
          frequencyMonths: 1,
        }]
      : undefined,
  })
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

    expect(result.selectedStrategy?.initialNetMonthlyImpact).toBe(200)
  })

  it('calcula impacto líquido mensal negativo', () => {
    const result = calculateDecisionDashboard(createState({
      principal: 1_200,
    }), 'option')

    expect(result.selectedStrategy?.initialNetMonthlyImpact).toBe(-200)
  })

  it('inclui cobranças periódicas no impacto mensal', () => {
    const result = calculateDecisionDashboard(createState({
      withCharge: true,
    }), 'option')

    expect(result.selectedStrategy?.firstPeriodPeriodicCharges).toBe(20)
    expect(result.selectedStrategy?.initialNetMonthlyImpact).toBe(220)
  })

  it('não inclui aporte extraordinário no impacto mensal recorrente', () => {
    const withExtra = calculateDecisionDashboard(createState(), 'option')
    const withoutExtra = calculateDecisionDashboard(createState({
      withExtraPayment: false,
    }), 'option')

    expect(withExtra.selectedStrategy?.firstPeriodExtraPayment).toBe(100)
    expect(withExtra.selectedStrategy?.initialNetMonthlyImpact).toBe(
      withoutExtra.selectedStrategy?.initialNetMonthlyImpact,
    )
  })

  it('inclui aporte no desembolso líquido do primeiro período', () => {
    const result = calculateDecisionDashboard(createState(), 'option')

    expect(result.selectedStrategy?.firstPeriodNetDisbursementImpact).toBe(300)
  })

  it('calcula o custo mensal combinado inicial', () => {
    const result = calculateDecisionDashboard(createState(), 'option')

    expect(result.optionMonthlyCashTco).toBe(200)
    expect(result.selectedStrategy?.initialCombinedMonthlyCost).toBe(700)
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

    expect(metrics?.averageMonthlyImpactDuringFinancing).toBe(
      (metrics?.scenario.totalDisbursed ?? 0)
        / (metrics?.scenario.effectiveTermMonths ?? 1)
        - result.operationalSavingsMonthly,
    )
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
})
