import { describe, expect, it } from 'vitest'
import type { Vehicle } from '../domain/vehicle'
import {
  addCandidate,
  assertValidAppState,
  calculateCandidateFinancing,
  calculateSelectedVehicleComparison,
  createInitialAppState,
  deleteCandidate,
  duplicateCandidate,
  editCandidate,
  selectComparisonCandidate,
  selectFinancingCandidate,
  setCandidateFinancing,
  setCurrentVehicle,
  type CandidateFinancingInput,
} from './appState'

const currentVehicle = {
  name: 'Atual',
  powertrain: 'ICE',
  annualMileageKm: 10_000,
  vehicleValue: 20_000,
  annualDepreciationRate: 0.1,
  annualCosts: {
    insurance: 1_000,
    propertyTax: 500,
    licensing: 100,
    maintenance: 400,
  },
  fuel: {
    description: 'Gasolina',
    consumption: { unit: 'km/L', value: 10 },
    pricePerLiter: 5,
  },
} satisfies Vehicle

const candidateVehicle = {
  name: 'Candidato',
  powertrain: 'BEV',
  annualMileageKm: 10_000,
  vehicleValue: 30_000,
  annualDepreciationRate: 0.1,
  annualCosts: {
    insurance: 800,
    propertyTax: 0,
    licensing: 100,
    maintenance: 100,
  },
  electricity: {
    consumptionKwhPer100Km: 20,
    pricePerKwh: 1,
    chargingLossRate: 0,
  },
} satisfies Vehicle

const secondCandidate = {
  ...candidateVehicle,
  name: 'Segundo candidato',
  vehicleValue: 40_000,
} satisfies Vehicle

const financing = {
  purchase: {
    price: 12_000,
    tradeInValue: 2_000,
  },
  rate: { value: 0, periodicity: 'monthly' },
  termMonths: 10,
  strategy: 'reduceTerm',
  extraPaymentSchedule: {
    oneTime: [{ amount: 2_000, period: 1 }],
  },
  periodicCharges: [{
    description: 'Seguro',
    amount: 25,
    startPeriod: 1,
    frequencyMonths: 1,
  }],
} satisfies CandidateFinancingInput

describe('estado do aplicativo', () => {
  it('cria estado inicial vazio e independente', () => {
    const first = createInitialAppState()
    const second = createInitialAppState()

    expect(first).toEqual({
      currentVehicle: null,
      candidates: [],
      selectedComparisonCandidateId: null,
      selectedFinancingCandidateId: null,
      financingByCandidateId: {},
    })
    expect(first).not.toBe(second)
    expect(first.candidates).not.toBe(second.candidates)
  })

  it('mantém exatamente um veículo atual ao substituir o cadastro', () => {
    const initial = createInitialAppState()
    const first = setCurrentVehicle(initial, currentVehicle, 'current-1')
    const second = setCurrentVehicle(first, {
      ...currentVehicle,
      name: 'Atual editado',
    }, 'current-2')

    expect(initial.currentVehicle).toBeNull()
    expect(first.currentVehicle?.id).toBe('current-1')
    expect(second.currentVehicle).toMatchObject({
      id: 'current-2',
      vehicle: { name: 'Atual editado' },
    })
  })

  it('cadastra, edita e duplica candidato com novo identificador', () => {
    const initial = createInitialAppState()
    const added = addCandidate(initial, candidateVehicle, 'candidate-1')
    const edited = editCandidate(added, 'candidate-1', {
      ...candidateVehicle,
      name: 'Candidato editado',
    })
    const duplicated = duplicateCandidate(
      edited,
      'candidate-1',
      'candidate-2',
    )

    expect(initial.candidates).toEqual([])
    expect(edited.candidates[0].vehicle.name).toBe('Candidato editado')
    expect(duplicated.candidates).toHaveLength(2)
    expect(duplicated.candidates[1].id).toBe('candidate-2')
    expect(duplicated.candidates[1].vehicle).toEqual(
      duplicated.candidates[0].vehicle,
    )
  })

  it('exclui candidato e limpa seleções e financiamento associados', () => {
    let state = addCandidate(
      createInitialAppState(),
      candidateVehicle,
      'candidate-1',
    )
    state = selectComparisonCandidate(state, 'candidate-1')
    state = selectFinancingCandidate(state, 'candidate-1')
    state = setCandidateFinancing(state, 'candidate-1', financing)
    const deleted = deleteCandidate(state, 'candidate-1')

    expect(deleted.candidates).toEqual([])
    expect(deleted.selectedComparisonCandidateId).toBeNull()
    expect(deleted.selectedFinancingCandidateId).toBeNull()
    expect(deleted.financingByCandidateId).toEqual({})
  })

  it('preserva candidatos e seleções não relacionados ao excluído', () => {
    let state = addCandidate(
      createInitialAppState(),
      candidateVehicle,
      'candidate-1',
    )
    state = addCandidate(state, secondCandidate, 'candidate-2')
    state = selectComparisonCandidate(state, 'candidate-2')
    state = selectFinancingCandidate(state, 'candidate-2')
    const deleted = deleteCandidate(state, 'candidate-1')

    expect(deleted.candidates.map((candidate) => candidate.id)).toEqual([
      'candidate-2',
    ])
    expect(deleted.selectedComparisonCandidateId).toBe('candidate-2')
    expect(deleted.selectedFinancingCandidateId).toBe('candidate-2')
  })
})

describe('comparação integrada', () => {
  it('usa o domínio existente e calcula diferenças monetárias e percentuais', () => {
    let state = setCurrentVehicle(
      createInitialAppState(),
      currentVehicle,
      'current-1',
    )
    state = addCandidate(state, candidateVehicle, 'candidate-1')
    state = selectComparisonCandidate(state, 'candidate-1')
    const result = calculateSelectedVehicleComparison(state)

    expect(result.currentTco.cashTco.annual).toBe(7_000)
    expect(result.currentTco.economicTco.annual).toBe(9_000)
    expect(result.candidateTco.cashTco.annual).toBe(3_000)
    expect(result.candidateTco.economicTco.annual).toBe(6_000)
    expect(result.operationalSavings.annual).toBe(4_000)
    expect(result.operationalSavings.monthly).toBeCloseTo(4_000 / 12, 12)
    expect(result.operationalSavings.perKm).toBeCloseTo(0.4, 12)
    expect(result.cashDifference.signed).toEqual(
      result.operationalSavings,
    )
    expect(result.cashDifference.absolute.annual).toBe(4_000)
    expect(result.cashDifference.percentage.annual).toBeCloseTo(
      4_000 / 7_000 * 100,
      12,
    )
    expect(result.economicDifference.signed.annual).toBe(3_000)
    expect(result.economicDifference.percentage.annual).toBeCloseTo(
      3_000 / 9_000 * 100,
      12,
    )
  })

  it('retorna percentual nulo quando a base atual é zero', () => {
    const zeroCostVehicle = {
      ...currentVehicle,
      vehicleValue: 0,
      annualDepreciationRate: 0,
      annualCosts: {
        insurance: 0,
        propertyTax: 0,
        licensing: 0,
        maintenance: 0,
      },
      fuel: {
        ...currentVehicle.fuel,
        pricePerLiter: 0,
      },
    } satisfies Vehicle
    let state = setCurrentVehicle(
      createInitialAppState(),
      zeroCostVehicle,
      'current-1',
    )
    state = addCandidate(state, candidateVehicle, 'candidate-1')
    state = selectComparisonCandidate(state, 'candidate-1')

    const result = calculateSelectedVehicleComparison(state)
    expect(result.cashDifference.percentage).toEqual({
      annual: null,
      monthly: null,
      perKm: null,
    })
    expect(result.economicDifference.percentage).toEqual({
      annual: null,
      monthly: null,
      perKm: null,
    })
  })
})

describe('financiamento associado ao candidato', () => {
  it('rejeita valor calculado zero coberto por troca e entrada', () => {
    const state = addCandidate(
      createInitialAppState(),
      candidateVehicle,
      'candidate-1',
    )

    expect(() => setCandidateFinancing(state, 'candidate-1', {
      ...financing,
      purchase: {
        price: 50_000,
        tradeInValue: 40_000,
        additionalDownPayment: 10_000,
      },
    })).toThrowError(
      'o valor financiado deve ser maior que zero para uma simulação PRICE',
    )
  })

  it('rejeita fallback manual igual a zero', () => {
    const state = addCandidate(
      createInitialAppState(),
      candidateVehicle,
      'candidate-1',
    )

    expect(() => setCandidateFinancing(state, 'candidate-1', {
      ...financing,
      purchase: { manualAmount: 0 },
    })).toThrowError(
      'o valor financiado deve ser maior que zero para uma simulação PRICE',
    )
  })

  it('preserva configuração com valor financiado positivo', () => {
    const initial = addCandidate(
      createInitialAppState(),
      candidateVehicle,
      'candidate-1',
    )
    const state = setCandidateFinancing(initial, 'candidate-1', financing)

    expect(state.financingByCandidateId['candidate-1']).toEqual(financing)
    expect(calculateCandidateFinancing(
      state,
      'candidate-1',
    ).financedAmount.amount).toBe(10_000)
  })

  it('rejeita estado carregado com financiamento de principal zero', () => {
    const state = addCandidate(
      createInitialAppState(),
      candidateVehicle,
      'candidate-1',
    )
    const invalidState = {
      ...state,
      financingByCandidateId: {
        'candidate-1': {
          ...financing,
          purchase: {
            price: 50_000,
            tradeInValue: 50_000,
          },
        },
      },
    }

    expect(() => assertValidAppState(invalidState)).toThrowError(
      'o valor financiado deve ser maior que zero para uma simulação PRICE',
    )
  })

  it('calcula o financiamento do candidato selecionado correto', () => {
    let state = addCandidate(
      createInitialAppState(),
      candidateVehicle,
      'candidate-1',
    )
    state = addCandidate(state, secondCandidate, 'candidate-2')
    state = setCandidateFinancing(state, 'candidate-1', {
      ...financing,
      purchase: { price: 5_000 },
    })
    state = setCandidateFinancing(state, 'candidate-2', financing)
    state = selectFinancingCandidate(state, 'candidate-2')

    const result = calculateCandidateFinancing(state)
    expect(result.candidate.id).toBe('candidate-2')
    expect(result.financedAmount).toEqual({
      amount: 10_000,
      source: 'calculated',
    })
    expect(result.selectedScenario.strategy).toBe('reduceTerm')
    expect(result.selectedScenario.totalExtraPayments).toBe(2_000)
  })

  it('recalcula resultados a partir das entradas sem persistir snapshots', () => {
    let state = addCandidate(
      createInitialAppState(),
      candidateVehicle,
      'candidate-1',
    )
    state = setCandidateFinancing(state, 'candidate-1', financing)
    const first = calculateCandidateFinancing(state, 'candidate-1')
    const updatedState = setCandidateFinancing(state, 'candidate-1', {
      ...financing,
      purchase: { price: 14_000, tradeInValue: 2_000 },
    })
    const second = calculateCandidateFinancing(updatedState, 'candidate-1')

    expect(first.financedAmount.amount).toBe(10_000)
    expect(second.financedAmount.amount).toBe(12_000)
    expect(second.selectedScenario.initialPayment).not.toBe(
      first.selectedScenario.initialPayment,
    )
    expect(JSON.stringify(updatedState)).not.toContain('schedule')
    expect(JSON.stringify(updatedState)).not.toContain('totalInterest')
  })

  it('é determinístico e não modifica entradas', () => {
    let state = addCandidate(
      createInitialAppState(),
      candidateVehicle,
      'candidate-1',
    )
    state = setCandidateFinancing(state, 'candidate-1', financing)
    const before = structuredClone(state)
    const first = calculateCandidateFinancing(state, 'candidate-1')
    const second = calculateCandidateFinancing(state, 'candidate-1')

    expect(state).toEqual(before)
    expect(second).toEqual(first)
  })
})
