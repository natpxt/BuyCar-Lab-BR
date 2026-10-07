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

export type ExtraPaymentStrategy = 'none' | 'reducePayment'

export interface OneTimeExtraPayment {
  readonly amount: number
  readonly period: number
}

export interface RecurringExtraPayment {
  readonly amount: number
  readonly startPeriod: number
  readonly endPeriod?: number
  readonly frequencyMonths: number
}

export interface ManualExtraPaymentReplacement {
  readonly amount: number
  readonly period: number
}

export interface ExtraPaymentSchedule {
  readonly oneTime?: readonly OneTimeExtraPayment[]
  readonly recurring?: RecurringExtraPayment
  readonly manualReplacements?: readonly ManualExtraPaymentReplacement[]
}

export interface PriceFinancingScenarioInput extends PriceFinancingInput {
  readonly strategy: ExtraPaymentStrategy
  readonly extraPaymentSchedule?: ExtraPaymentSchedule
}

export interface PriceScheduleEntry {
  readonly period: number
  readonly openingBalance: number
  readonly interest: number
  readonly contractualPayment: number
  readonly principalAmortizedByPayment: number
  readonly principalAmortizedByExtraPayment: number
  readonly extraPaymentApplied: number
  readonly totalPayment: number
  /** Alias compatível: principal total amortizado no período. */
  readonly principalAmortized: number
  /** Alias compatível: prestação contratual do período. */
  readonly payment: number
  readonly closingBalance: number
}

export interface PriceFinancingResult {
  readonly strategy: ExtraPaymentStrategy
  readonly financedPrincipal: number
  readonly monthlyRate: number
  readonly initialPayment: number
  readonly schedule: readonly PriceScheduleEntry[]
  readonly totalInterest: number
  readonly totalExtraPayments: number
  readonly totalPrincipalAmortized: number
  readonly totalDisbursed: number
  /** Alias compatível de totalDisbursed. */
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
  | 'outOfRange'
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

function validateExtraPaymentSchedule(
  input: unknown,
): FinancingValidationIssue[] {
  const issues: FinancingValidationIssue[] = []
  if (input === undefined) {
    return issues
  }
  if (typeof input !== 'object' || input === null) {
    return [{
      field: 'extraPaymentSchedule',
      code: 'required',
      message: 'extraPaymentSchedule deve ser um objeto',
    }]
  }

  const schedule = input as Record<string, unknown>
  if (schedule.oneTime !== undefined) {
    if (!Array.isArray(schedule.oneTime)) {
      issues.push({
        field: 'extraPaymentSchedule.oneTime',
        code: 'required',
        message: 'extraPaymentSchedule.oneTime deve ser uma lista',
      })
    } else {
      schedule.oneTime.forEach((entry, index) => {
        const prefix = `extraPaymentSchedule.oneTime.${index}`
        if (typeof entry !== 'object' || entry === null) {
          issues.push({
            field: prefix,
            code: 'required',
            message: `${prefix} deve ser um objeto`,
          })
          return
        }
        const payment = entry as Record<string, unknown>
        validateNumber(issues, `${prefix}.amount`, payment.amount)
        validateNumber(issues, `${prefix}.period`, payment.period, {
          positive: true,
          integer: true,
        })
      })
    }
  }

  if (schedule.recurring !== undefined) {
    const prefix = 'extraPaymentSchedule.recurring'
    if (typeof schedule.recurring !== 'object' || schedule.recurring === null) {
      issues.push({
        field: prefix,
        code: 'required',
        message: `${prefix} deve ser um objeto`,
      })
    } else {
      const recurring = schedule.recurring as Record<string, unknown>
      const startPeriod = recurring.startPeriod
      const endPeriod = recurring.endPeriod
      validateNumber(issues, `${prefix}.amount`, recurring.amount)
      const startIsValid = validateNumber(
        issues,
        `${prefix}.startPeriod`,
        startPeriod,
        { positive: true, integer: true },
      )
      validateNumber(
        issues,
        `${prefix}.frequencyMonths`,
        recurring.frequencyMonths,
        { positive: true, integer: true },
      )

      if (endPeriod !== undefined) {
        const endIsValid = validateNumber(
          issues,
          `${prefix}.endPeriod`,
          endPeriod,
          { positive: true, integer: true },
        )
        if (
          startIsValid
          && endIsValid
          && endPeriod < startPeriod
        ) {
          issues.push({
            field: `${prefix}.endPeriod`,
            code: 'outOfRange',
            message: `${prefix}.endPeriod não pode anteceder startPeriod`,
          })
        }
      }
    }
  }

  if (schedule.manualReplacements !== undefined) {
    if (!Array.isArray(schedule.manualReplacements)) {
      issues.push({
        field: 'extraPaymentSchedule.manualReplacements',
        code: 'required',
        message: 'extraPaymentSchedule.manualReplacements deve ser uma lista',
      })
    } else {
      schedule.manualReplacements.forEach((entry, index) => {
        const prefix = `extraPaymentSchedule.manualReplacements.${index}`
        if (typeof entry !== 'object' || entry === null) {
          issues.push({
            field: prefix,
            code: 'required',
            message: `${prefix} deve ser um objeto`,
          })
          return
        }
        const replacement = entry as Record<string, unknown>
        validateNumber(issues, `${prefix}.amount`, replacement.amount)
        validateNumber(issues, `${prefix}.period`, replacement.period, {
          positive: true,
          integer: true,
        })
      })
    }
  }

  return issues
}

export function validatePriceFinancingScenarioInput(
  input: unknown,
): FinancingValidationIssue[] {
  const issues = validatePriceFinancingInput(input)
  if (typeof input !== 'object' || input === null) {
    return issues
  }

  const scenario = input as Record<string, unknown>
  if (scenario.strategy !== 'none' && scenario.strategy !== 'reducePayment') {
    issues.push({
      field: 'strategy',
      code: 'unsupported',
      message: 'strategy deve ser none ou reducePayment',
    })
  }
  issues.push(...validateExtraPaymentSchedule(scenario.extraPaymentSchedule))
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

function assertValidPriceFinancingScenarioInput(
  input: unknown,
): asserts input is PriceFinancingScenarioInput {
  const issues = validatePriceFinancingScenarioInput(input)
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

  return calculateValidatedPriceScenario({
    ...input,
    strategy: 'none',
  })
}

function calculateScheduledExtraPayment(
  period: number,
  schedule: ExtraPaymentSchedule | undefined,
): number {
  if (schedule === undefined) {
    return 0
  }

  const oneTimeAmount = schedule.oneTime?.reduce(
    (total, payment) => payment.period === period
      ? total + payment.amount
      : total,
    0,
  ) ?? 0
  const recurring = schedule.recurring
  let recurringAmount = 0

  if (
    recurring !== undefined
    && period >= recurring.startPeriod
    && (recurring.endPeriod === undefined || period <= recurring.endPeriod)
    && (period - recurring.startPeriod) % recurring.frequencyMonths === 0
  ) {
    recurringAmount = schedule.manualReplacements?.find(
      (replacement) => replacement.period === period,
    )?.amount ?? recurring.amount
  }

  return assertFiniteResult(
    `extraPaymentSchedule.${period}.amount`,
    oneTimeAmount + recurringAmount,
  )
}

function calculateValidatedPriceScenario(
  input: PriceFinancingScenarioInput,
): PriceFinancingResult {

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
    const remainingPeriods = input.termMonths - period + 1
    const scheduledPayment = input.strategy === 'reducePayment'
      ? calculateInitialPayment(
          openingBalance,
          monthlyRate,
          remainingPeriods,
        )
      : initialPayment
    const interest = assertFiniteResult(
      `schedule.${period}.interest`,
      openingBalance * monthlyRate,
    )
    const scheduledPrincipal = assertFiniteResult(
      `schedule.${period}.principalAmortizedByPayment`,
      scheduledPayment - interest,
    )

    if (scheduledPrincipal <= 0) {
      throw new FinancingValidationError([{
        field: `schedule.${period}.principalAmortizedByPayment`,
        code: 'invalidCalculation',
        message: `schedule.${period}.principalAmortizedByPayment deve ser maior que zero`,
      }])
    }

    const principalAmortizedByPayment = period === input.termMonths
      ? openingBalance
      : Math.min(scheduledPrincipal, openingBalance)
    const contractualPayment = assertFiniteResult(
      `schedule.${period}.contractualPayment`,
      interest + principalAmortizedByPayment,
    )
    const balanceAfterPayment = openingBalance - principalAmortizedByPayment
    const requestedExtraPayment = input.strategy === 'reducePayment'
      ? calculateScheduledExtraPayment(period, input.extraPaymentSchedule)
      : 0
    const principalAmortizedByExtraPayment = Math.min(
      requestedExtraPayment,
      balanceAfterPayment,
    )
    const principalAmortized = assertFiniteResult(
      `schedule.${period}.principalAmortized`,
      principalAmortizedByPayment + principalAmortizedByExtraPayment,
    )
    const totalPayment = assertFiniteResult(
      `schedule.${period}.totalPayment`,
      contractualPayment + principalAmortizedByExtraPayment,
    )
    const closingBalance = balanceAfterPayment
      - principalAmortizedByExtraPayment

    schedule.push({
      period,
      openingBalance,
      interest,
      contractualPayment,
      principalAmortizedByPayment,
      principalAmortizedByExtraPayment,
      extraPaymentApplied: principalAmortizedByExtraPayment,
      totalPayment,
      principalAmortized,
      payment: contractualPayment,
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
  const totalExtraPayments = schedule.reduce(
    (total, entry) => total + entry.extraPaymentApplied,
    0,
  )
  const totalDisbursed = schedule.reduce(
    (total, entry) => total + entry.totalPayment,
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
    strategy: input.strategy,
    financedPrincipal: input.principal,
    monthlyRate,
    initialPayment,
    schedule,
    totalInterest: assertFiniteResult('totalInterest', totalInterest),
    totalPrincipalAmortized: assertFiniteResult(
      'totalPrincipalAmortized',
      totalPrincipalAmortized,
    ),
    totalExtraPayments: assertFiniteResult(
      'totalExtraPayments',
      totalExtraPayments,
    ),
    totalDisbursed: assertFiniteResult('totalDisbursed', totalDisbursed),
    totalPaid: assertFiniteResult('totalPaid', totalDisbursed),
    originalTermMonths: input.termMonths,
    effectiveTermMonths: schedule.length,
    payoffPeriod,
  }
}

export function calculatePriceScenario(
  input: PriceFinancingScenarioInput,
): PriceFinancingResult {
  assertValidPriceFinancingScenarioInput(input)
  return calculateValidatedPriceScenario(input)
}
