import type { CandidateFinancingInput } from '../application/appState'
import type {
  EffectiveRatePeriodicity,
  ExtraPaymentStrategy,
} from '../domain/financing'
import {
  decimalToPercentageInput,
  numberToInput,
  parseOptionalPtBrNumber,
  parsePtBrNumber,
  percentageInputToDecimal,
} from './format'

export interface OneTimePaymentRow {
  readonly key: string
  readonly amount: string
  readonly period: string
}

export interface ManualReplacementRow {
  readonly key: string
  readonly amount: string
  readonly period: string
}

export interface PeriodicChargeRow {
  readonly key: string
  readonly description: string
  readonly amount: string
  readonly startPeriod: string
  readonly endPeriod: string
  readonly frequencyMonths: string
}

export interface FinancingFormState {
  readonly price: string
  readonly tradeInValue: string
  readonly additionalDownPayment: string
  readonly financedCosts: string
  readonly manualAmount: string
  readonly ratePercent: string
  readonly ratePeriodicity: EffectiveRatePeriodicity
  readonly termMonths: string
  readonly strategy: ExtraPaymentStrategy
  readonly oneTimePayments: readonly OneTimePaymentRow[]
  readonly recurringEnabled: boolean
  readonly recurringAmount: string
  readonly recurringStartPeriod: string
  readonly recurringEndPeriod: string
  readonly recurringFrequencyMonths: string
  readonly manualReplacements: readonly ManualReplacementRow[]
  readonly periodicCharges: readonly PeriodicChargeRow[]
}

export function createFinancingFormState(
  financing?: CandidateFinancingInput,
  suggestedPrice?: number,
): FinancingFormState {
  const recurring = financing?.extraPaymentSchedule?.recurring
  return {
    price: numberToInput(
      financing === undefined ? suggestedPrice : financing.purchase.price,
    ),
    tradeInValue: numberToInput(financing?.purchase.tradeInValue),
    additionalDownPayment: numberToInput(
      financing?.purchase.additionalDownPayment,
    ),
    financedCosts: numberToInput(financing?.purchase.financedCosts),
    manualAmount: numberToInput(financing?.purchase.manualAmount),
    ratePercent: financing
      ? decimalToPercentageInput(financing.rate.value)
      : '',
    ratePeriodicity: financing?.rate.periodicity ?? 'monthly',
    termMonths: numberToInput(financing?.termMonths),
    strategy: financing?.strategy ?? 'none',
    oneTimePayments: financing?.extraPaymentSchedule?.oneTime?.map(
      (payment, index) => ({
        key: `one-${index}`,
        amount: numberToInput(payment.amount),
        period: numberToInput(payment.period),
      }),
    ) ?? [],
    recurringEnabled: recurring !== undefined,
    recurringAmount: numberToInput(recurring?.amount),
    recurringStartPeriod: numberToInput(recurring?.startPeriod),
    recurringEndPeriod: numberToInput(recurring?.endPeriod),
    recurringFrequencyMonths: numberToInput(recurring?.frequencyMonths),
    manualReplacements:
      financing?.extraPaymentSchedule?.manualReplacements?.map(
        (replacement, index) => ({
          key: `manual-${index}`,
          amount: numberToInput(replacement.amount),
          period: numberToInput(replacement.period),
        }),
      ) ?? [],
    periodicCharges: financing?.periodicCharges?.map((charge, index) => ({
      key: `charge-${index}`,
      description: charge.description,
      amount: numberToInput(charge.amount),
      startPeriod: numberToInput(charge.startPeriod),
      endPeriod: numberToInput(charge.endPeriod),
      frequencyMonths: numberToInput(charge.frequencyMonths),
    })) ?? [],
  }
}

export function buildFinancingFromForm(
  form: FinancingFormState,
): CandidateFinancingInput {
  const price = parseOptionalPtBrNumber(form.price, 'Preço')
  const purchase = price === undefined
    ? {
        manualAmount: parsePtBrNumber(
          form.manualAmount,
          'Valor financiado manual',
        ),
      }
    : {
        price,
        tradeInValue: parseOptionalPtBrNumber(
          form.tradeInValue,
          'Valor de troca',
        ),
        additionalDownPayment: parseOptionalPtBrNumber(
          form.additionalDownPayment,
          'Entrada adicional',
        ),
        financedCosts: parseOptionalPtBrNumber(
          form.financedCosts,
          'Custos financiados',
        ),
      }
  const oneTime = form.oneTimePayments.map((payment) => ({
    amount: parsePtBrNumber(payment.amount, 'Valor do aporte único'),
    period: parsePtBrNumber(payment.period, 'Período do aporte único'),
  }))
  const manualReplacements = form.manualReplacements.map((replacement) => ({
    amount: parsePtBrNumber(replacement.amount, 'Valor da substituição'),
    period: parsePtBrNumber(replacement.period, 'Período da substituição'),
  }))
  const recurring = form.recurringEnabled
    ? {
        amount: parsePtBrNumber(form.recurringAmount, 'Aporte recorrente'),
        startPeriod: parsePtBrNumber(
          form.recurringStartPeriod,
          'Período inicial do aporte',
        ),
        endPeriod: parseOptionalPtBrNumber(
          form.recurringEndPeriod,
          'Período final do aporte',
        ),
        frequencyMonths: parsePtBrNumber(
          form.recurringFrequencyMonths,
          'Frequência do aporte',
        ),
      }
    : undefined

  if (manualReplacements.length > 0 && recurring === undefined) {
    throw new Error(
      'Substituições manuais exigem um aporte recorrente ativo',
    )
  }

  const replacementPeriods = new Set<number>()
  manualReplacements.forEach((replacement) => {
    if (replacementPeriods.has(replacement.period)) {
      throw new Error(
        `Existe mais de uma substituição no período ${replacement.period}`,
      )
    }
    replacementPeriods.add(replacement.period)

    if (recurring !== undefined) {
      const isBeforeStart = replacement.period < recurring.startPeriod
      const isAfterEnd = recurring.endPeriod !== undefined
        && replacement.period > recurring.endPeriod
      const isOutsideFrequency = recurring.frequencyMonths > 0
        && Number.isInteger(recurring.frequencyMonths)
        && (replacement.period - recurring.startPeriod)
          % recurring.frequencyMonths !== 0

      if (isBeforeStart || isAfterEnd || isOutsideFrequency) {
        throw new Error(
          `A substituição do período ${replacement.period} não corresponde a uma ocorrência do aporte recorrente`,
        )
      }
    }
  })

  return {
    purchase,
    rate: {
      value: percentageInputToDecimal(form.ratePercent, 'Taxa efetiva'),
      periodicity: form.ratePeriodicity,
    },
    termMonths: parsePtBrNumber(form.termMonths, 'Prazo'),
    strategy: form.strategy,
    extraPaymentSchedule: oneTime.length > 0
      || manualReplacements.length > 0
      || recurring !== undefined
      ? { oneTime, recurring, manualReplacements }
      : undefined,
    periodicCharges: form.periodicCharges.length > 0
      ? form.periodicCharges.map((charge) => ({
          description: charge.description.trim(),
          amount: parsePtBrNumber(charge.amount, 'Valor da cobrança'),
          startPeriod: parsePtBrNumber(
            charge.startPeriod,
            'Período inicial da cobrança',
          ),
          endPeriod: parseOptionalPtBrNumber(
            charge.endPeriod,
            'Período final da cobrança',
          ),
          frequencyMonths: parsePtBrNumber(
            charge.frequencyMonths,
            'Frequência da cobrança',
          ),
        }))
      : undefined,
  }
}
