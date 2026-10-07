import { describe, expect, it } from 'vitest'
import {
  calculateMonthlyEffectiveRate,
  calculatePriceBaseline,
  FinancingValidationError,
  type FinancingValidationIssue,
  type PriceFinancingInput,
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
