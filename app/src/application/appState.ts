import {
  calculateFinancedAmount,
  comparePriceStrategies,
  validatePriceFinancingScenarioInput,
  type EffectiveRate,
  type ExtraPaymentSchedule,
  type ExtraPaymentStrategy,
  type FinancedAmountInput,
  type PeriodicCharge,
  type PriceStrategyComparison,
} from '../domain/financing'
import {
  calculateOperationalSavings,
  calculateVehicleTco,
  type CostByPeriod,
  type TcoResult,
} from '../domain/tco'
import {
  assertValidVehicle,
  type Vehicle,
} from '../domain/vehicle'

export interface StoredVehicle {
  readonly id: string
  readonly vehicle: Vehicle
}

export interface CandidateFinancingInput {
  readonly purchase: FinancedAmountInput
  readonly rate: EffectiveRate
  readonly termMonths: number
  readonly strategy: ExtraPaymentStrategy
  readonly extraPaymentSchedule?: ExtraPaymentSchedule
  readonly periodicCharges?: readonly PeriodicCharge[]
}

export interface AppState {
  readonly currentVehicle: StoredVehicle | null
  readonly candidates: readonly StoredVehicle[]
  readonly selectedComparisonCandidateId: string | null
  readonly selectedFinancingCandidateId: string | null
  readonly financingByCandidateId: Readonly<
    Record<string, CandidateFinancingInput>
  >
}

export interface NullableCostByPeriod {
  readonly annual: number | null
  readonly monthly: number | null
  readonly perKm: number | null
}

export interface TcoDifference {
  /** Diferença com sinal na direção veículo atual menos candidato. */
  readonly signed: CostByPeriod
  readonly absolute: CostByPeriod
  readonly percentage: NullableCostByPeriod
}

export interface IntegratedVehicleComparison {
  readonly current: StoredVehicle
  readonly candidate: StoredVehicle
  readonly currentTco: TcoResult
  readonly candidateTco: TcoResult
  readonly operationalSavings: CostByPeriod
  readonly cashDifference: TcoDifference
  readonly economicDifference: TcoDifference
}

export interface CandidateFinancingResult {
  readonly candidate: StoredVehicle
  readonly financedAmount: ReturnType<typeof calculateFinancedAmount>
  readonly comparison: PriceStrategyComparison
  readonly selectedScenario: PriceStrategyComparison[ExtraPaymentStrategy]
}

export class AppStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppStateError'
  }
}

export function createInitialAppState(): AppState {
  return {
    currentVehicle: null,
    candidates: [],
    selectedComparisonCandidateId: null,
    selectedFinancingCandidateId: null,
    financingByCandidateId: {},
  }
}

function assertValidId(id: string): void {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new AppStateError('id do veículo é obrigatório')
  }
}

function assertUnusedId(state: AppState, id: string): void {
  assertValidId(id)
  if (
    state.currentVehicle?.id === id
    || state.candidates.some((candidate) => candidate.id === id)
  ) {
    throw new AppStateError(`id de veículo duplicado: ${id}`)
  }
}

function findCandidate(state: AppState, candidateId: string): StoredVehicle {
  const candidate = state.candidates.find((item) => item.id === candidateId)
  if (candidate === undefined) {
    throw new AppStateError(`candidato não encontrado: ${candidateId}`)
  }
  return candidate
}

export function setCurrentVehicle(
  state: AppState,
  vehicle: Vehicle,
  id: string,
): AppState {
  assertValidVehicle(vehicle)
  assertValidId(id)
  if (state.candidates.some((candidate) => candidate.id === id)) {
    throw new AppStateError(`id de veículo duplicado: ${id}`)
  }
  return {
    ...state,
    currentVehicle: { id, vehicle },
  }
}

export function clearCurrentVehicle(state: AppState): AppState {
  return {
    ...state,
    currentVehicle: null,
  }
}

export function addCandidate(
  state: AppState,
  vehicle: Vehicle,
  id: string,
): AppState {
  assertValidVehicle(vehicle)
  assertUnusedId(state, id)
  return {
    ...state,
    candidates: [...state.candidates, { id, vehicle }],
  }
}

export function editCandidate(
  state: AppState,
  candidateId: string,
  vehicle: Vehicle,
): AppState {
  assertValidVehicle(vehicle)
  findCandidate(state, candidateId)
  return {
    ...state,
    candidates: state.candidates.map((candidate) => (
      candidate.id === candidateId
        ? { ...candidate, vehicle }
        : candidate
    )),
  }
}

export function duplicateCandidate(
  state: AppState,
  candidateId: string,
  newId: string,
): AppState {
  const candidate = findCandidate(state, candidateId)
  return addCandidate(state, candidate.vehicle, newId)
}

export function deleteCandidate(
  state: AppState,
  candidateId: string,
): AppState {
  findCandidate(state, candidateId)
  const financingByCandidateId = { ...state.financingByCandidateId }
  delete financingByCandidateId[candidateId]
  return {
    ...state,
    candidates: state.candidates.filter(
      (candidate) => candidate.id !== candidateId,
    ),
    selectedComparisonCandidateId:
      state.selectedComparisonCandidateId === candidateId
        ? null
        : state.selectedComparisonCandidateId,
    selectedFinancingCandidateId:
      state.selectedFinancingCandidateId === candidateId
        ? null
        : state.selectedFinancingCandidateId,
    financingByCandidateId,
  }
}

export function selectComparisonCandidate(
  state: AppState,
  candidateId: string | null,
): AppState {
  if (candidateId !== null) {
    findCandidate(state, candidateId)
  }
  return {
    ...state,
    selectedComparisonCandidateId: candidateId,
  }
}

export function selectFinancingCandidate(
  state: AppState,
  candidateId: string | null,
): AppState {
  if (candidateId !== null) {
    findCandidate(state, candidateId)
  }
  return {
    ...state,
    selectedFinancingCandidateId: candidateId,
  }
}

export function setCandidateFinancing(
  state: AppState,
  candidateId: string,
  financing: CandidateFinancingInput,
): AppState {
  findCandidate(state, candidateId)
  validateCandidateFinancing(financing)
  return {
    ...state,
    financingByCandidateId: {
      ...state.financingByCandidateId,
      [candidateId]: financing,
    },
  }
}

function calculateSignedDifference(
  current: CostByPeriod,
  candidate: CostByPeriod,
): CostByPeriod {
  return {
    annual: current.annual - candidate.annual,
    monthly: current.monthly - candidate.monthly,
    perKm: current.perKm - candidate.perKm,
  }
}

function calculateDifference(
  current: CostByPeriod,
  candidate: CostByPeriod,
): TcoDifference {
  const signed = calculateSignedDifference(current, candidate)
  const percentage = (
    difference: number,
    currentValue: number,
  ): number | null => currentValue === 0
    ? null
    : difference / currentValue * 100

  return {
    signed,
    absolute: {
      annual: Math.abs(signed.annual),
      monthly: Math.abs(signed.monthly),
      perKm: Math.abs(signed.perKm),
    },
    percentage: {
      annual: percentage(signed.annual, current.annual),
      monthly: percentage(signed.monthly, current.monthly),
      perKm: percentage(signed.perKm, current.perKm),
    },
  }
}

export function calculateSelectedVehicleComparison(
  state: AppState,
): IntegratedVehicleComparison {
  if (state.currentVehicle === null) {
    throw new AppStateError('veículo atual não cadastrado')
  }
  if (state.selectedComparisonCandidateId === null) {
    throw new AppStateError('candidato de comparação não selecionado')
  }

  const candidate = findCandidate(
    state,
    state.selectedComparisonCandidateId,
  )
  const currentTco = calculateVehicleTco(state.currentVehicle.vehicle)
  const candidateTco = calculateVehicleTco(candidate.vehicle)
  const operationalSavings = calculateOperationalSavings(
    state.currentVehicle.vehicle,
    candidate.vehicle,
  )

  return {
    current: state.currentVehicle,
    candidate,
    currentTco,
    candidateTco,
    operationalSavings,
    cashDifference: calculateDifference(
      currentTco.cashTco,
      candidateTco.cashTco,
    ),
    economicDifference: calculateDifference(
      currentTco.economicTco,
      candidateTco.economicTco,
    ),
  }
}

function validateCandidateFinancing(
  financing: CandidateFinancingInput,
): void {
  const financedAmount = calculateFinancedAmount(financing.purchase)
  if (financedAmount.amount <= 0) {
    throw new AppStateError(
      'o valor financiado deve ser maior que zero para uma simulação PRICE',
    )
  }
  const issues = validatePriceFinancingScenarioInput({
    principal: financedAmount.amount,
    termMonths: financing.termMonths,
    rate: financing.rate,
    strategy: financing.strategy,
    extraPaymentSchedule: financing.extraPaymentSchedule,
    periodicCharges: financing.periodicCharges,
  })
  if (issues.length > 0) {
    throw new AppStateError(issues.map((issue) => issue.message).join('; '))
  }
}

export function calculateCandidateFinancing(
  state: AppState,
  candidateId: string | null = state.selectedFinancingCandidateId,
): CandidateFinancingResult {
  if (candidateId === null) {
    throw new AppStateError('candidato de financiamento não selecionado')
  }
  const candidate = findCandidate(state, candidateId)
  const financing = state.financingByCandidateId[candidateId]
  if (financing === undefined) {
    throw new AppStateError(`financiamento não configurado: ${candidateId}`)
  }

  const financedAmount = calculateFinancedAmount(financing.purchase)
  const comparison = comparePriceStrategies({
    principal: financedAmount.amount,
    termMonths: financing.termMonths,
    rate: financing.rate,
    extraPaymentSchedule: financing.extraPaymentSchedule,
    periodicCharges: financing.periodicCharges,
  })

  return {
    candidate,
    financedAmount,
    comparison,
    selectedScenario: comparison[financing.strategy],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertStoredVehicle(value: unknown): asserts value is StoredVehicle {
  if (!isRecord(value) || typeof value.id !== 'string') {
    throw new AppStateError('registro de veículo inválido')
  }
  assertValidId(value.id)
  assertValidVehicle(value.vehicle)
}

export function assertValidAppState(input: unknown): asserts input is AppState {
  if (!isRecord(input)) {
    throw new AppStateError('estado do aplicativo inválido')
  }

  if (input.currentVehicle !== null) {
    assertStoredVehicle(input.currentVehicle)
  }
  if (!Array.isArray(input.candidates)) {
    throw new AppStateError('lista de candidatos inválida')
  }
  input.candidates.forEach(assertStoredVehicle)

  const candidates = input.candidates as StoredVehicle[]
  const ids = [
    ...(input.currentVehicle === null
      ? []
      : [(input.currentVehicle as StoredVehicle).id]),
    ...candidates.map((candidate) => candidate.id),
  ]
  if (new Set(ids).size !== ids.length) {
    throw new AppStateError('estado contém identificadores duplicados')
  }

  const candidateIds = new Set(candidates.map((candidate) => candidate.id))
  const selections = [
    ['selectedComparisonCandidateId', input.selectedComparisonCandidateId],
    ['selectedFinancingCandidateId', input.selectedFinancingCandidateId],
  ] as const
  selections.forEach(([field, value]) => {
    if (value !== null && (typeof value !== 'string' || !candidateIds.has(value))) {
      throw new AppStateError(`${field} inválido`)
    }
  })

  if (!isRecord(input.financingByCandidateId)) {
    throw new AppStateError('configurações de financiamento inválidas')
  }
  Object.entries(input.financingByCandidateId).forEach(([candidateId, value]) => {
    if (!candidateIds.has(candidateId) || !isRecord(value)) {
      throw new AppStateError(`financiamento órfão ou inválido: ${candidateId}`)
    }
    validateCandidateFinancing(value as unknown as CandidateFinancingInput)
  })
}
