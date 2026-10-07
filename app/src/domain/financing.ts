export type EffectiveRatePeriodicity = 'monthly' | 'annual'

export interface EffectiveRate {
  /** Valor em forma decimal: 1,7% = 0,017. */
  readonly value: number
  readonly periodicity: EffectiveRatePeriodicity
}

export interface PriceFinancingInput {
  readonly principal: number
  readonly termMonths: number
  readonly rate: EffectiveRate
}

export interface PriceScheduleEntry {
  readonly period: number
  readonly openingBalance: number
  readonly interest: number
  readonly principalAmortized: number
  readonly payment: number
  readonly closingBalance: number
}

export interface PriceFinancingResult {
  readonly financedPrincipal: number
  readonly monthlyRate: number
  readonly initialPayment: number
  readonly schedule: readonly PriceScheduleEntry[]
  readonly totalInterest: number
  readonly totalPrincipalAmortized: number
  readonly totalPaid: number
  readonly originalTermMonths: number
  readonly effectiveTermMonths: number
  readonly payoffPeriod: number
}

export type FinancingValidationCode =
  | 'required'
  | 'notFinite'
  | 'negative'
  | 'notPositive'
  | 'notInteger'
  | 'unsupported'
  | 'invalidCalculation'

export interface FinancingValidationIssue {
  readonly field: string
  readonly code: FinancingValidationCode
  readonly message: string
}

export class FinancingValidationError extends Error {
  readonly issues: readonly FinancingValidationIssue[]

  constructor(issues: readonly FinancingValidationIssue[]) {
    super(issues.map((issue) => issue.message).join('; '))
    this.name = 'FinancingValidationError'
    this.issues = issues
  }
}

function validateNumber(
  issues: FinancingValidationIssue[],
  field: string,
  value: unknown,
  options: { positive?: boolean; integer?: boolean } = {},
): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({
      field,
      code: 'notFinite',
      message: `${field} deve ser um número finito`,
    })
    return false
  }

  if (options.positive ? value <= 0 : value < 0) {
    issues.push({
      field,
      code: options.positive ? 'notPositive' : 'negative',
      message: options.positive
        ? `${field} deve ser maior que zero`
        : `${field} não pode ser negativo`,
    })
    return false
  }

  if (options.integer && !Number.isInteger(value)) {
    issues.push({
      field,
      code: 'notInteger',
      message: `${field} deve ser um número inteiro`,
    })
    return false
  }

  return true
}

function validateEffectiveRate(input: unknown): FinancingValidationIssue[] {
  const issues: FinancingValidationIssue[] = []

  if (typeof input !== 'object' || input === null) {
    return [{
      field: 'rate',
      code: 'required',
      message: 'rate é obrigatório',
    }]
  }

  const rate = input as Record<string, unknown>
  validateNumber(issues, 'rate.value', rate.value)
  if (rate.periodicity !== 'monthly' && rate.periodicity !== 'annual') {
    issues.push({
      field: 'rate.periodicity',
      code: 'unsupported',
      message: 'rate.periodicity deve ser monthly ou annual',
    })
  }

  return issues
}

export function validatePriceFinancingInput(
  input: unknown,
): FinancingValidationIssue[] {
  if (typeof input !== 'object' || input === null) {
    return [{
      field: 'financing',
      code: 'required',
      message: 'financing é obrigatório',
    }]
  }

  const financing = input as Record<string, unknown>
  const issues: FinancingValidationIssue[] = []
  validateNumber(issues, 'principal', financing.principal, { positive: true })
  validateNumber(issues, 'termMonths', financing.termMonths, {
    positive: true,
    integer: true,
  })
  issues.push(...validateEffectiveRate(financing.rate))
  return issues
}

function assertValidPriceFinancingInput(
  input: unknown,
): asserts input is PriceFinancingInput {
  const issues = validatePriceFinancingInput(input)
  if (issues.length > 0) {
    throw new FinancingValidationError(issues)
  }
}

function assertFiniteResult(field: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new FinancingValidationError([{
      field,
      code: 'invalidCalculation',
      message: `${field} produziu um resultado não finito`,
    }])
  }
  return value
}

export function calculateMonthlyEffectiveRate(rate: EffectiveRate): number {
  const issues = validateEffectiveRate(rate)
  if (issues.length > 0) {
    throw new FinancingValidationError(issues)
  }

  if (rate.periodicity === 'monthly') {
    return rate.value
  }

  return assertFiniteResult(
    'monthlyRate',
    (1 + rate.value) ** (1 / 12) - 1,
  )
}

function calculateInitialPayment(
  principal: number,
  monthlyRate: number,
  termMonths: number,
): number {
  if (monthlyRate === 0) {
    return principal / termMonths
  }

  const denominator = -Math.expm1(
    -termMonths * Math.log1p(monthlyRate),
  )
  return assertFiniteResult(
    'initialPayment',
    principal * monthlyRate / denominator,
  )
}

export function calculatePriceBaseline(
  input: PriceFinancingInput,
): PriceFinancingResult {
  assertValidPriceFinancingInput(input)

  const monthlyRate = calculateMonthlyEffectiveRate(input.rate)
  const initialPayment = calculateInitialPayment(
    input.principal,
    monthlyRate,
    input.termMonths,
  )
  const schedule: PriceScheduleEntry[] = []
  let balance = input.principal

  for (let period = 1; period <= input.termMonths; period += 1) {
    const openingBalance = balance
    const interest = assertFiniteResult(
      `schedule.${period}.interest`,
      openingBalance * monthlyRate,
    )
    const scheduledPrincipal = assertFiniteResult(
      `schedule.${period}.principalAmortized`,
      initialPayment - interest,
    )

    if (scheduledPrincipal <= 0) {
      throw new FinancingValidationError([{
        field: `schedule.${period}.principalAmortized`,
        code: 'invalidCalculation',
        message: `schedule.${period}.principalAmortized deve ser maior que zero`,
      }])
    }

    const principalAmortized = period === input.termMonths
      ? openingBalance
      : Math.min(scheduledPrincipal, openingBalance)
    const payment = assertFiniteResult(
      `schedule.${period}.payment`,
      interest + principalAmortized,
    )
    const closingBalance = openingBalance - principalAmortized

    schedule.push({
      period,
      openingBalance,
      interest,
      principalAmortized,
      payment,
      closingBalance,
    })
    balance = closingBalance

    if (balance === 0) {
      break
    }
  }

  const totalInterest = schedule.reduce(
    (total, entry) => total + entry.interest,
    0,
  )
  const totalPrincipalAmortized = schedule.reduce(
    (total, entry) => total + entry.principalAmortized,
    0,
  )
  const totalPaid = schedule.reduce(
    (total, entry) => total + entry.payment,
    0,
  )
  const payoffPeriod = schedule.at(-1)?.period

  if (payoffPeriod === undefined || schedule.at(-1)?.closingBalance !== 0) {
    throw new FinancingValidationError([{
      field: 'schedule',
      code: 'invalidCalculation',
      message: 'o cronograma não alcançou a quitação',
    }])
  }

  return {
    financedPrincipal: input.principal,
    monthlyRate,
    initialPayment,
    schedule,
    totalInterest: assertFiniteResult('totalInterest', totalInterest),
    totalPrincipalAmortized: assertFiniteResult(
      'totalPrincipalAmortized',
      totalPrincipalAmortized,
    ),
    totalPaid: assertFiniteResult('totalPaid', totalPaid),
    originalTermMonths: input.termMonths,
    effectiveTermMonths: schedule.length,
    payoffPeriod,
  }
}
