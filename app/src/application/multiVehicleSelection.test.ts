import { describe, expect, it } from 'vitest'
import type { Vehicle } from '../domain/vehicle'
import {
  addCandidate,
  createInitialAppState,
  setCurrentVehicle,
} from './appState'
import {
  calculateOptionComparisons,
  initializeOptionSelection,
  reconcileOptionSelection,
  toggleOptionSelection,
} from './multiVehicleSelection'

function vehicle(name: string, maintenance: number): Vehicle {
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
      maintenance,
    },
    fuel: {
      description: 'Gasolina',
      consumption: { unit: 'km/L', value: 10 },
      pricePerLiter: 5,
    },
  }
}

describe('seleção de opções para comparação', () => {
  it('carrega a seleção única persistida da v0.9.0', () => {
    expect(initializeOptionSelection(['a', 'b'], 'b')).toEqual(['b'])
  })

  it('seleciona uma e duas opções', () => {
    expect(toggleOptionSelection([], 'a').selectedIds).toEqual(['a'])
    expect(toggleOptionSelection(['a'], 'b').selectedIds).toEqual(['a', 'b'])
  })

  it('rejeita a terceira opção sem descartar as existentes', () => {
    expect(toggleOptionSelection(['a', 'b'], 'c')).toEqual({
      selectedIds: ['a', 'b'],
      limitReached: true,
    })
  })

  it('permite desmarcar uma opção', () => {
    expect(toggleOptionSelection(['a', 'b'], 'a').selectedIds).toEqual(['b'])
  })

  it('permite três e quatro opções no RC sem modificar o limite legado', () => {
    expect(toggleOptionSelection(['a', 'b'], 'c', 4).selectedIds).toEqual(['a', 'b', 'c'])
    expect(toggleOptionSelection(['a', 'b', 'c'], 'd', 4).selectedIds).toEqual(['a', 'b', 'c', 'd'])
  })

  it('rejeita a quinta opção sem perder as quatro selecionadas', () => {
    expect(toggleOptionSelection(['a', 'b', 'c', 'd'], 'e', 4)).toEqual({
      selectedIds: ['a', 'b', 'c', 'd'], limitReached: true,
    })
  })

  it('reconcilia quatro opções preservando ordem e removendo duplicatas', () => {
    expect(reconcileOptionSelection(['a', 'a', 'b', 'c', 'd', 'e'], ['a', 'b', 'c', 'd', 'e'], 'a', 4))
      .toEqual(['a', 'b', 'c', 'd'])
  })

  it('remove seleção excluída e mantém ao menos uma disponível', () => {
    expect(reconcileOptionSelection(['a', 'b'], ['b', 'c'], 'b')).toEqual(['b'])
    expect(reconcileOptionSelection(['a'], ['b', 'c'], 'b')).toEqual(['b'])
  })

  it('calcula duas opções independentemente contra o veículo atual', () => {
    let state = setCurrentVehicle(createInitialAppState(), vehicle('Atual', 2_000), 'current')
    state = addCandidate(state, vehicle('Opção A', 1_000), 'a')
    state = addCandidate(state, vehicle('Opção B', 3_000), 'b')

    const results = calculateOptionComparisons(state, ['a', 'b'])

    expect(results.map((result) => result.candidate.vehicle.name)).toEqual(['Opção A', 'Opção B'])
    expect(results[0].operationalSavings.annual).toBe(1_000)
    expect(results[1].operationalSavings.annual).toBe(-1_000)
  })

  it('compara quatro opções contra a mesma referência sem mudar os cálculos', () => {
    let state = setCurrentVehicle(createInitialAppState(), vehicle('Atual', 2_000), 'current')
    for (const [index, maintenance] of [1_000, 2_000, 3_000, 4_000].entries()) {
      state = addCandidate(state, vehicle(`Opção ${index}`, maintenance), `option-${index}`)
    }
    const results = calculateOptionComparisons(state, state.candidates.map((candidate) => candidate.id))
    expect(results).toHaveLength(4)
    expect(results.map((result) => result.current.id)).toEqual(['current', 'current', 'current', 'current'])
    expect(results.map((result) => result.operationalSavings.annual)).toEqual([1_000, 0, -1_000, -2_000])
  })
})
