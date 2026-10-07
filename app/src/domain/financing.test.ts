import { describe, expect, it } from 'vitest'
import {
  calculateMonthlyEffectiveRate,
  calculatePriceBaseline,
  calculatePriceScenario,
  FinancingValidationError,
  type FinancingValidationIssue,
  type PriceFinancingInput,
  type PriceFinancingScenarioInput,
} from './financing'

const goldenInput = {
  principal: 80_000,
  termMonths: 48,
  rate: {
    value: 0.017,
    periodicity: 'monthly',
  },
} satisfies PriceFinancingInput

function getValidationIssues(input: unknown): readonly FinancingValidationIssue[] {
  try {
    calculatePriceBaseline(input as PriceFinancingInput)
  } catch (error) {
    if (error instanceof FinancingValidationError) {
      return error.issues
    }
    throw error
  }

  throw new Error('era esperado um FinancingValidationError')
}

function getScenarioValidationIssues(
  input: unknown,
): readonly FinancingValidationIssue[] {
  try {
    calculatePriceScenario(input as PriceFinancingScenarioInput)
  } catch (error) {
    if (error instanceof FinancingValidationError) {
      return error.issues
    }
    throw error
  }

  throw new Error('era esperado um FinancingValidationError')
}

describe('PRICE baseline', () => {
  it('reconcilia o golden case de 80 mil em 48 meses a 1,7% a.m.', () => {
    const result = calculatePriceBaseline(goldenInput)

    expect(result.monthlyRate).toBe(0.017)
    expect(result.initialPayment).toBeCloseTo(2_451.51, 2)
    expect(result.totalInterest).toBeCloseTo(37_672.53, 2)
    expect(result.totalPrincipalAmortized).toBeCloseTo(80_000, 8)
    expect(result.totalPaid).toBeCloseTo(117_672.53, 2)
    expect(result.originalTermMonths).toBe(48)
    expect(result.effectiveTermMonths).toBe(48)
    expect(result.payoffPeriod).toBe(48)
    expect(result.schedule.at(-1)?.closingBalance).toBe(0)
  })

  it('converte a taxa anual efetiva equivalente sem arredondamento', () => {
    const annualRate = 0.224197350053
    const monthlyResult = calculatePriceBaseline(goldenInput)
    const annualResult = calculatePriceBaseline({
      ...goldenInput,
      rate: { value: annualRate, periodicity: 'annual' },
    })

    expect(annualRate * 100).toBeCloseTo(22.4197350053, 10)
    expect(annualResult.monthlyRate).toBeCloseTo(0.017, 12)
    expect(annualResult.monthlyRate).toBeCloseTo(
      monthlyResult.monthlyRate,
      12,
    )
    expect(annualResult.initialPayment).toBeCloseTo(
      monthlyResult.initialPayment,
      2,
    )
    expect(annualResult.totalInterest).toBeCloseTo(
      monthlyResult.totalInterest,
      2,
    )
    expect(annualResult.totalPaid).toBeCloseTo(monthlyResult.totalPaid, 2)
  })

  it('usa diretamente uma taxa mensal efetiva', () => {
    expect(calculateMonthlyEffectiveRate(goldenInput.rate)).toBe(0.017)
  })

  it('calcula taxa zero por divisão uniforme do principal', () => {
    const result = calculatePriceBaseline({
      principal: 1_200,
      termMonths: 12,
      rate: { value: 0, periodicity: 'monthly' },
    })

    expect(result.initialPayment).toBe(100)
    expect(result.totalInterest).toBe(0)
    expect(result.totalPrincipalAmortized).toBe(1_200)
    expect(result.totalPaid).toBe(1_200)
    expect(result.effectiveTermMonths).toBe(12)
    expect(result.schedule.every((entry) => entry.interest === 0)).toBe(true)
    expect(result.schedule.at(-1)?.closingBalance).toBe(0)
  })

  it('usa sempre o saldo final interno anterior e nunca gera saldo negativo', () => {
    const result = calculatePriceBaseline(goldenInput)

    result.schedule.forEach((entry, index) => {
      expect(entry.closingBalance).toBeGreaterThanOrEqual(0)
      if (index > 0) {
        expect(entry.openingBalance).toBe(
          result.schedule[index - 1].closingBalance,
        )
      }
    })

    const principalSum = result.schedule.reduce(
      (total, entry) => total + entry.principalAmortized,
      0,
    )
    expect(Math.abs(principalSum - goldenInput.principal)).toBeLessThan(1e-8)
  })

  it('é determinístico e não modifica a entrada', () => {
    const before = structuredClone(goldenInput)
    const first = calculatePriceBaseline(goldenInput)
    const second = calculatePriceBaseline(goldenInput)

    expect(goldenInput).toEqual(before)
    expect(second).toEqual(first)
  })
})

describe('validação do financiamento', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita principal inválido: %s',
    (principal) => {
      const issues = getValidationIssues({ ...goldenInput, principal })
      expect(issues).toContainEqual(expect.objectContaining({
        field: 'principal',
      }))
    },
  )

  it('rejeita taxa negativa', () => {
    const issues = getValidationIssues({
      ...goldenInput,
      rate: { value: -0.01, periodicity: 'monthly' },
    })
    expect(issues).toContainEqual(expect.objectContaining({
      field: 'rate.value',
      code: 'negative',
    }))
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita prazo inválido: %s',
    (termMonths) => {
      const issues = getValidationIssues({ ...goldenInput, termMonths })
      expect(issues).toContainEqual(expect.objectContaining({
        field: 'termMonths',
      }))
    },
  )

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita taxa não finita: %s',
    (value) => {
      const issues = getValidationIssues({
        ...goldenInput,
        rate: { value, periodicity: 'monthly' },
      })
      expect(issues).toContainEqual(expect.objectContaining({
        field: 'rate.value',
        code: 'notFinite',
      }))
    },
  )

  it('rejeita periodicidade desconhecida em runtime', () => {
    const issues = getValidationIssues({
      ...goldenInput,
      rate: { value: 0.017, periodicity: 'weekly' },
    })
    expect(issues).toContainEqual({
      field: 'rate.periodicity',
      code: 'unsupported',
      message: 'rate.periodicity deve ser monthly ou annual',
    })
  })
})

describe('PRICE com reducePayment', () => {
  it('aplica aporte único e reduz literalmente as prestações futuras a taxa zero', () => {
    const result = calculatePriceScenario({
      principal: 1_200,
      termMonths: 4,
      rate: { value: 0, periodicity: 'monthly' },
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        oneTime: [{ amount: 400, period: 1 }],
      },
    })

    expect(result.schedule[0]).toMatchObject({
      contractualPayment: 300,
      principalAmortizedByPayment: 300,
      principalAmortizedByExtraPayment: 400,
      extraPaymentApplied: 400,
      totalPayment: 700,
      closingBalance: 500,
    })
    expect(result.schedule[1].contractualPayment).toBeCloseTo(500 / 3, 12)
    expect(result.totalInterest).toBe(0)
    expect(result.totalExtraPayments).toBe(400)
    expect(result.totalDisbursed).toBe(1_200)
    expect(result.effectiveTermMonths).toBe(4)
    expect(result.payoffPeriod).toBe(4)
  })

  it('aplica aporte recorrente somente até o período final', () => {
    const result = calculatePriceScenario({
      principal: 1_200,
      termMonths: 6,
      rate: { value: 0, periodicity: 'monthly' },
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        recurring: {
          amount: 60,
          startPeriod: 2,
          endPeriod: 4,
          frequencyMonths: 1,
        },
      },
    })

    expect(result.schedule.map((entry) => entry.extraPaymentApplied)).toEqual([
      0,
      60,
      60,
      60,
      0,
      0,
    ])
  })

  it('respeita frequência recorrente maior que um mês', () => {
    const result = calculatePriceScenario({
      principal: 1_600,
      termMonths: 8,
      rate: { value: 0, periodicity: 'monthly' },
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        recurring: {
          amount: 30,
          startPeriod: 2,
          endPeriod: 6,
          frequencyMonths: 2,
        },
      },
    })

    expect(result.schedule.slice(0, 7).map(
      (entry) => entry.extraPaymentApplied,
    )).toEqual([0, 30, 0, 30, 0, 30, 0])
  })

  it('mantém recorrência sem período final até a quitação', () => {
    const result = calculatePriceScenario({
      principal: 1_600,
      termMonths: 8,
      rate: { value: 0, periodicity: 'monthly' },
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        recurring: {
          amount: 10,
          startPeriod: 3,
          frequencyMonths: 2,
        },
      },
    })

    expect(result.schedule.map((entry) => entry.extraPaymentApplied)).toEqual([
      0,
      0,
      10,
      0,
      10,
      0,
      10,
      0,
    ])
  })

  it('substitui manualmente somente uma ocorrência recorrente', () => {
    const result = calculatePriceScenario({
      principal: 1_200,
      termMonths: 6,
      rate: { value: 0, periodicity: 'monthly' },
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        recurring: {
          amount: 50,
          startPeriod: 2,
          endPeriod: 4,
          frequencyMonths: 1,
        },
        manualReplacements: [{ amount: 125, period: 3 }],
      },
    })

    expect(result.schedule.slice(1, 4).map(
      (entry) => entry.extraPaymentApplied,
    )).toEqual([50, 125, 50])
  })

  it('ignora aportes previstos depois da quitação', () => {
    const result = calculatePriceScenario({
      principal: 1_000,
      termMonths: 10,
      rate: { value: 0, periodicity: 'monthly' },
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        oneTime: [
          { amount: 900, period: 1 },
          { amount: 100, period: 5 },
        ],
      },
    })

    expect(result.effectiveTermMonths).toBe(1)
    expect(result.payoffPeriod).toBe(1)
    expect(result.totalExtraPayments).toBe(900)
  })

  it('limita o aporte ao saldo elegível após a prestação', () => {
    const result = calculatePriceScenario({
      principal: 1_000,
      termMonths: 10,
      rate: { value: 0, periodicity: 'monthly' },
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        oneTime: [{ amount: 5_000, period: 1 }],
      },
    })

    expect(result.schedule[0].contractualPayment).toBe(100)
    expect(result.schedule[0].extraPaymentApplied).toBe(900)
    expect(result.schedule[0].totalPayment).toBe(1_000)
    expect(result.schedule[0].closingBalance).toBe(0)
    expect(result.totalExtraPayments).toBe(900)
    expect(result.totalDisbursed).toBe(1_000)
  })

  it('reduz juros e a prestação seguinte sem alterar o prazo quando há saldo', () => {
    const baseline = calculatePriceBaseline(goldenInput)
    const result = calculatePriceScenario({
      ...goldenInput,
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        oneTime: [{ amount: 10_000, period: 1 }],
      },
    })

    expect(result.schedule[0].contractualPayment).toBe(
      baseline.schedule[0].contractualPayment,
    )
    expect(result.schedule[1].contractualPayment).toBeLessThan(
      result.schedule[0].contractualPayment,
    )
    expect(result.totalInterest).toBeLessThan(baseline.totalInterest)
    expect(result.effectiveTermMonths).toBe(goldenInput.termMonths)
    expect(result.payoffPeriod).toBe(goldenInput.termMonths)
  })

  it('mantém totais coerentes sem contar aportes duas vezes', () => {
    const result = calculatePriceScenario({
      ...goldenInput,
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        oneTime: [{ amount: 5_000, period: 3 }],
        recurring: {
          amount: 250,
          startPeriod: 6,
          endPeriod: 18,
          frequencyMonths: 3,
        },
      },
    })
    const principalByPayment = result.schedule.reduce(
      (total, entry) => total + entry.principalAmortizedByPayment,
      0,
    )
    const principalByExtraPayment = result.schedule.reduce(
      (total, entry) => total + entry.principalAmortizedByExtraPayment,
      0,
    )
    const payments = result.schedule.reduce(
      (total, entry) => total + entry.totalPayment,
      0,
    )

    expect(principalByPayment + principalByExtraPayment).toBeCloseTo(
      goldenInput.principal,
      8,
    )
    expect(result.totalPrincipalAmortized).toBeCloseTo(
      goldenInput.principal,
      8,
    )
    expect(result.totalExtraPayments).toBeCloseTo(
      principalByExtraPayment,
      10,
    )
    expect(result.totalDisbursed).toBeCloseTo(payments, 10)
    expect(result.totalDisbursed).toBeCloseTo(
      result.totalPrincipalAmortized + result.totalInterest,
      8,
    )
  })

  it('preserva o baseline quando a estratégia é none', () => {
    const baseline = calculatePriceBaseline(goldenInput)
    const result = calculatePriceScenario({
      ...goldenInput,
      strategy: 'none',
      extraPaymentSchedule: {
        oneTime: [{ amount: 80_000, period: 1 }],
      },
    })

    expect(result.schedule).toEqual(baseline.schedule)
    expect(result.totalExtraPayments).toBe(0)
    expect(result.totalDisbursed).toBe(baseline.totalDisbursed)
  })

  it('é determinístico e não modifica a agenda de entrada', () => {
    const input = {
      ...goldenInput,
      strategy: 'reducePayment',
      extraPaymentSchedule: {
        oneTime: [{ amount: 1_000, period: 2 }],
        recurring: {
          amount: 100,
          startPeriod: 3,
          frequencyMonths: 2,
        },
        manualReplacements: [{ amount: 175, period: 5 }],
      },
    } satisfies PriceFinancingScenarioInput
    const before = structuredClone(input)
    const first = calculatePriceScenario(input)
    const second = calculatePriceScenario(input)

    expect(input).toEqual(before)
    expect(second).toEqual(first)
  })
})

describe('validação da agenda de aportes', () => {
  it.each([
    ['extraPaymentSchedule.oneTime.0.amount', {
      oneTime: [{ amount: -1, period: 1 }],
    }],
    ['extraPaymentSchedule.oneTime.0.amount', {
      oneTime: [{ amount: Number.NaN, period: 1 }],
    }],
    ['extraPaymentSchedule.oneTime.0.period', {
      oneTime: [{ amount: 100, period: 0 }],
    }],
    ['extraPaymentSchedule.oneTime.0.period', {
      oneTime: [{ amount: 100, period: 1.5 }],
    }],
    ['extraPaymentSchedule.recurring.amount', {
      recurring: {
        amount: -1,
        startPeriod: 1,
        frequencyMonths: 1,
      },
    }],
    ['extraPaymentSchedule.recurring.startPeriod', {
      recurring: {
        amount: 100,
        startPeriod: 0,
        frequencyMonths: 1,
      },
    }],
    ['extraPaymentSchedule.recurring.frequencyMonths', {
      recurring: {
        amount: 100,
        startPeriod: 1,
        frequencyMonths: 0,
      },
    }],
    ['extraPaymentSchedule.recurring.frequencyMonths', {
      recurring: {
        amount: 100,
        startPeriod: 1,
        frequencyMonths: 1.5,
      },
    }],
    ['extraPaymentSchedule.recurring.endPeriod', {
      recurring: {
        amount: 100,
        startPeriod: 3,
        endPeriod: 2,
        frequencyMonths: 1,
      },
    }],
    ['extraPaymentSchedule.manualReplacements.0.amount', {
      manualReplacements: [{ amount: -1, period: 1 }],
    }],
    ['extraPaymentSchedule.manualReplacements.0.period', {
      manualReplacements: [{ amount: 100, period: -1 }],
    }],
  ])('rejeita entrada inválida em %s', (field, extraPaymentSchedule) => {
    const issues = getScenarioValidationIssues({
      ...goldenInput,
      strategy: 'reducePayment',
      extraPaymentSchedule,
    })

    expect(issues).toContainEqual(expect.objectContaining({ field }))
  })
})
