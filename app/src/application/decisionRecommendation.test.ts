import { describe, expect, it } from 'vitest'
import type { PriceScheduleEntry } from '../domain/financing'
import type { Vehicle } from '../domain/vehicle'
import {
  addCandidate,
  createInitialAppState,
  setCandidateFinancing,
  setCurrentVehicle,
  type AppState,
} from './appState'
import {
  calculateCashImpactOverHorizon,
  calculateDecisionDashboard,
  calculateDecisionOptionsComparison,
  selectRecommendedStrategies,
} from './decisionDashboard'

function scheduleEntry(
  period: number,
  totalPayment: number,
  extraPaymentApplied = 0,
  periodicChargeTotal = 0,
): PriceScheduleEntry {
  const contractualPayment = totalPayment
    - extraPaymentApplied
    - periodicChargeTotal
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
    closingBalance: Math.max(0, 10_000 - totalPayment),
  }
}

function vehicle(name: string, annualMaintenance: number): Vehicle {
  return {
    name,
    powertrain: 'ICE',
    annualMileageKm: 12_000,
    vehicleValue: 50_000,
    annualDepreciationRate: 0.05,
    annualCosts: {
      insurance: 0,
      propertyTax: 0,
      licensing: 0,
      maintenance: annualMaintenance,
    },
    fuel: {
      description: 'Gasolina',
      consumption: { unit: 'km/L', value: 10 },
      pricePerLiter: 0,
    },
  }
}

function addFinancing(
  state: AppState,
  optionId: string,
  principal: number,
  termMonths: number,
  withExtraPayment = false,
): AppState {
  return setCandidateFinancing(state, optionId, {
    purchase: { manualAmount: principal },
    rate: { value: withExtraPayment ? 0.01 : 0, periodicity: 'monthly' },
    termMonths,
    strategy: 'none',
    extraPaymentSchedule: withExtraPayment
      ? { oneTime: [{ amount: principal / 2, period: 1 }] }
      : undefined,
  })
}

function comparisonState(): AppState {
  let state = setCurrentVehicle(
    createInitialAppState(),
    vehicle('Atual', 30_000),
    'current',
  )
  state = addCandidate(state, vehicle('Opção A', 6_000), 'a')
  state = addCandidate(state, vehicle('Opção B', 18_000), 'b')
  state = addFinancing(state, 'a', 20_000, 48, true)
  state = addFinancing(state, 'b', 10_000, 36, false)
  return state
}

describe('recomendação financeira do Ciladômetro', () => {
  it('seleciona none quando possui o menor impacto total', () => {
    expect(selectRecommendedStrategies({
      none: 100,
      reducePayment: 110,
      reduceTerm: 120,
    })).toEqual(['none'])
  })

  it('seleciona reducePayment quando possui o menor impacto total', () => {
    expect(selectRecommendedStrategies({
      none: 110,
      reducePayment: 100,
      reduceTerm: 120,
    })).toEqual(['reducePayment'])
  })

  it('seleciona reduceTerm quando possui o menor impacto total', () => {
    expect(selectRecommendedStrategies({
      none: 120,
      reducePayment: 110,
      reduceTerm: 100,
    })).toEqual(['reduceTerm'])
  })

  it('preserva empate numérico entre estratégias sem desempate arbitrário', () => {
    const value = 10_000
    expect(selectRecommendedStrategies({
      none: value,
      reducePayment: value + Number.EPSILON * value * 4,
      reduceTerm: value,
    })).toEqual(['none', 'reducePayment', 'reduceTerm'])
  })

  it('não inclui valor fora da tolerância em empate', () => {
    expect(selectRecommendedStrategies({
      none: 100,
      reducePayment: 100.000_001,
      reduceTerm: 100,
    })).toEqual(['none', 'reduceTerm'])
  })

  it('usa totalPayment no impacto do primeiro mês, incluindo aporte', () => {
    const result = calculateCashImpactOverHorizon([
      scheduleEntry(1, 2_882.42, 400),
    ], 1_588.37, 1)
    expect(result.firstPeriodImpact).toBeCloseTo(1_294.05, 10)
  })

  it('inclui cobrança no impacto somente pelo totalPayment', () => {
    const result = calculateCashImpactOverHorizon([
      scheduleEntry(1, 550, 0, 50),
      scheduleEntry(2, 500),
    ], 100, 2)
    expect(result.impacts).toEqual([450, 400])
  })

  it('usa pagamento zero e mantém economia operacional após quitação', () => {
    const result = calculateCashImpactOverHorizon([
      scheduleEntry(1, 500),
      scheduleEntry(2, 500),
    ], 200, 4)
    expect(result.impacts).toEqual([300, 300, -200, -200])
    expect(result.afterPayoffImpact).toBe(-200)
  })

  it('analisa financiamento de 36 meses em horizonte de 48', () => {
    const schedule = Array.from({ length: 36 }, (_, index) => (
      scheduleEntry(index + 1, 100)
    ))
    const result = calculateCashImpactOverHorizon(schedule, 20, 48)
    expect(result.impacts).toHaveLength(48)
    expect(result.impacts.slice(36)).toEqual(Array(12).fill(-20))
    expect(result.cumulativeImpact).toBe(2_640)
    expect(result.averageImpact).toBe(55)
  })

  it('recomenda com base no prazo contratual original', () => {
    const result = calculateDecisionDashboard(comparisonState(), 'a')
    expect(result.recommendedStrategies).not.toBeNull()
    expect(result.recommendedStrategy?.analysisHorizonMonths).toBe(48)
    expect(result.recommendedStrategy?.horizonCashImpacts).toHaveLength(48)
  })

  it('preserva empate das três estratégias quando não há aportes', () => {
    const result = calculateDecisionDashboard(comparisonState(), 'b')
    expect(result.recommendedStrategies).toEqual([
      'none',
      'reducePayment',
      'reduceTerm',
    ])
  })
})

describe('comparação de opções no Ciladômetro', () => {
  it('calcula uma opção na mesma estrutura comparativa', () => {
    const comparison = calculateDecisionOptionsComparison(
      comparisonState(),
      ['a'],
    )
    expect(comparison.options).toHaveLength(1)
    expect(comparison.comparisonHorizonMonths).toBe(48)
  })

  it('calcula duas opções independentemente contra o veículo atual', () => {
    const comparison = calculateDecisionOptionsComparison(
      comparisonState(),
      ['a', 'b'],
    )
    expect(comparison.options.map(
      (option) => option.result.comparison.candidate.vehicle.name,
    )).toEqual(['Opção A', 'Opção B'])
    expect(comparison.options[0].result.operationalSavingsMonthly).toBe(2_000)
    expect(comparison.options[1].result.operationalSavingsMonthly).toBe(1_000)
  })

  it('usa o maior prazo original como horizonte comum', () => {
    const comparison = calculateDecisionOptionsComparison(
      comparisonState(),
      ['a', 'b'],
    )
    expect(comparison.comparisonHorizonMonths).toBe(48)
    comparison.options.forEach((option) => {
      expect(option.commonHorizonCashImpact?.impacts).toHaveLength(48)
    })
  })

  it('mantém economia operacional da opção quitada até o fim do horizonte comum', () => {
    const comparison = calculateDecisionOptionsComparison(
      comparisonState(),
      ['a', 'b'],
    )
    const optionB = comparison.options[1]
    expect(optionB.result.recommendedStrategy?.scenario.originalTermMonths).toBe(36)
    expect(optionB.commonHorizonCashImpact?.impacts.slice(36)).toEqual(
      Array(12).fill(-1_000),
    )
  })

  it('identifica o menor impacto total no mesmo horizonte', () => {
    const comparison = calculateDecisionOptionsComparison(
      comparisonState(),
      ['a', 'b'],
    )
    expect(comparison.lowestTotalImpactOptionIds).toEqual(['a'])
    expect(comparison.totalImpactDifference).toBeGreaterThan(0)
  })

  it('pode identificar vencedor inicial diferente do total', () => {
    const comparison = calculateDecisionOptionsComparison(
      comparisonState(),
      ['a', 'b'],
    )
    expect(comparison.lowestTotalImpactOptionIds).toEqual(['a'])
    expect(comparison.lowestFirstPeriodImpactOptionIds).toEqual(['b'])
  })

  it('preserva empate entre veículos', () => {
    let state = setCurrentVehicle(
      createInitialAppState(),
      vehicle('Atual', 12_000),
      'current',
    )
    state = addCandidate(state, vehicle('A', 6_000), 'a')
    state = addCandidate(state, vehicle('B', 6_000), 'b')
    state = addFinancing(state, 'a', 12_000, 12)
    state = addFinancing(state, 'b', 12_000, 12)

    const comparison = calculateDecisionOptionsComparison(state, ['a', 'b'])
    expect(comparison.lowestTotalImpactOptionIds).toEqual(['a', 'b'])
    expect(comparison.lowestFirstPeriodImpactOptionIds).toEqual(['a', 'b'])
  })

  it('não bloqueia opção financiada quando a outra não possui financiamento', () => {
    let state = comparisonState()
    const financing = { ...state.financingByCandidateId }
    delete financing.b
    state = { ...state, financingByCandidateId: financing }

    const comparison = calculateDecisionOptionsComparison(state, ['a', 'b'])
    expect(comparison.options[0].result.recommendedStrategy).not.toBeNull()
    expect(comparison.options[0].commonHorizonCashImpact).not.toBeNull()
    expect(comparison.options[0].commonHorizonCashImpact?.horizonMonths).toBe(48)
    expect(comparison.options[1].result.recommendedStrategy).toBeNull()
    expect(comparison.options[1].commonHorizonCashImpact).toBeNull()
    expect(comparison.options[1].result.operationalSavingsMonthly).toBe(1_000)
  })

  it('não cria vencedor de impacto total com financiamento ausente', () => {
    let state = comparisonState()
    const financing = { ...state.financingByCandidateId }
    delete financing.b
    state = { ...state, financingByCandidateId: financing }

    const comparison = calculateDecisionOptionsComparison(state, ['a', 'b'])
    expect(comparison.comparisonHorizonMonths).toBeNull()
    expect(comparison.lowestTotalImpactOptionIds).toBeNull()
    expect(comparison.lowestFirstPeriodImpactOptionIds).toBeNull()
  })

  it('é determinístico e não modifica o estado', () => {
    const state = comparisonState()
    const before = structuredClone(state)
    const first = calculateDecisionOptionsComparison(state, ['a', 'b'])
    const second = calculateDecisionOptionsComparison(state, ['a', 'b'])
    expect(first).toEqual(second)
    expect(state).toEqual(before)
  })

  it('compara quatro opções financiadas no mesmo horizonte', () => {
    let state = comparisonState()
    state = addCandidate(state, vehicle('C', 15_000), 'c')
    state = addCandidate(state, vehicle('D', 18_000), 'd')
    state = addFinancing(state, 'c', 15_000, 24)
    state = addFinancing(state, 'd', 20_000, 60)
    const comparison = calculateDecisionOptionsComparison(state, ['a', 'b', 'c', 'd'])
    expect(comparison.options).toHaveLength(4)
    expect(comparison.comparisonHorizonMonths).toBe(60)
    expect(comparison.options.map((option) => option.commonHorizonCashImpact?.horizonMonths)).toEqual([60, 60, 60, 60])
    const minimum = Math.min(...comparison.options.map((option) => option.commonHorizonCashImpact!.cumulativeImpact))
    for (const id of comparison.lowestTotalImpactOptionIds ?? []) {
      expect(comparison.options.find((option) => option.result.comparison.candidate.id === id)?.commonHorizonCashImpact?.cumulativeImpact)
        .toBeCloseTo(minimum)
    }
  })
})
