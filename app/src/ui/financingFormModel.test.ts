import { describe, expect, it } from 'vitest'
import type { CandidateFinancingInput } from '../application/appState'
import { calculateFinancedAmount } from '../domain/financing'
import {
  buildFinancingFromForm,
  createFinancingFormState,
} from './financingFormModel'

const manualFinancing: CandidateFinancingInput = {
  purchase: { manualAmount: 80_000 },
  rate: { value: 0.017, periodicity: 'monthly' },
  termMonths: 48,
  strategy: 'none',
}

describe('formulário de financiamento', () => {
  it('constrói entradas completas com porcentagem legível', () => {
    const form = {
      ...createFinancingFormState(),
      price: '120.000',
      tradeInValue: '40.000',
      additionalDownPayment: '10.000',
      financedCosts: '2.000',
      ratePercent: '1,7',
      termMonths: '48',
      strategy: 'reduceTerm' as const,
      oneTimePayments: [{ key: 'one', amount: '5.000', period: '3' }],
      recurringEnabled: true,
      recurringAmount: '250',
      recurringStartPeriod: '2',
      recurringEndPeriod: '',
      recurringFrequencyMonths: '2',
      periodicCharges: [{
        key: 'charge',
        description: 'Seguro',
        amount: '50',
        startPeriod: '1',
        endPeriod: '12',
        frequencyMonths: '1',
      }],
    }
    const financing = buildFinancingFromForm(form)
    expect(financing.purchase.price).toBe(120_000)
    expect(financing.rate.value).toBe(0.017)
    expect(financing.strategy).toBe('reduceTerm')
    expect(financing.extraPaymentSchedule?.oneTime?.[0]).toEqual({
      amount: 5_000,
      period: 3,
    })
    expect(financing.extraPaymentSchedule?.recurring?.endPeriod).toBeUndefined()
    expect(financing.periodicCharges?.[0].description).toBe('Seguro')
  })

  it('usa valor manual somente quando o preço não está disponível', () => {
    const financing = buildFinancingFromForm({
      ...createFinancingFormState(),
      price: '',
      manualAmount: '80.000',
      ratePercent: '1',
      termMonths: '24',
    })
    expect(financing.purchase).toEqual({ manualAmount: 80_000 })
  })

  it('usa o preço sugerido somente em uma configuração nova', () => {
    expect(createFinancingFormState(undefined, 120_000).price).toBe('120000')
  })

  it('preserva o preço salvo em vez do preço sugerido', () => {
    const financing: CandidateFinancingInput = {
      ...manualFinancing,
      purchase: { price: 95_000 },
    }

    expect(createFinancingFormState(financing, 120_000).price).toBe('95000')
  })

  it('preserva semanticamente um fallback manual existente', () => {
    const form = createFinancingFormState(manualFinancing, 120_000)
    const roundTrip = buildFinancingFromForm(form)

    expect(form.price).toBe('')
    expect(form.manualAmount).toBe('80000')
    expect(roundTrip.purchase).toEqual({ manualAmount: 80_000 })
    expect(calculateFinancedAmount(roundTrip.purchase)).toEqual({
      amount: 80_000,
      source: 'manual',
    })
  })

  it('rejeita substituição manual sem aporte recorrente', () => {
    expect(() => buildFinancingFromForm({
      ...createFinancingFormState(),
      price: '80.000',
      ratePercent: '1',
      termMonths: '24',
      manualReplacements: [{ key: 'manual', amount: '200', period: '2' }],
    })).toThrow('exigem um aporte recorrente ativo')
  })

  it('rejeita substituição fora da frequência recorrente', () => {
    expect(() => buildFinancingFromForm({
      ...createFinancingFormState(),
      price: '80.000',
      ratePercent: '1',
      termMonths: '24',
      recurringEnabled: true,
      recurringAmount: '100',
      recurringStartPeriod: '2',
      recurringFrequencyMonths: '2',
      manualReplacements: [{ key: 'manual', amount: '200', period: '3' }],
    })).toThrow('não corresponde a uma ocorrência')
  })

  it('aceita substituição que coincide com a frequência recorrente', () => {
    const financing = buildFinancingFromForm({
      ...createFinancingFormState(),
      price: '80.000',
      ratePercent: '1',
      termMonths: '24',
      recurringEnabled: true,
      recurringAmount: '100',
      recurringStartPeriod: '2',
      recurringFrequencyMonths: '2',
      manualReplacements: [{ key: 'manual', amount: '200', period: '4' }],
    })

    expect(financing.extraPaymentSchedule?.manualReplacements).toEqual([
      { amount: 200, period: 4 },
    ])
  })

  it('rejeita substituição posterior ao fim da recorrência', () => {
    expect(() => buildFinancingFromForm({
      ...createFinancingFormState(),
      price: '80.000',
      ratePercent: '1',
      termMonths: '24',
      recurringEnabled: true,
      recurringAmount: '100',
      recurringStartPeriod: '2',
      recurringEndPeriod: '6',
      recurringFrequencyMonths: '2',
      manualReplacements: [{ key: 'manual', amount: '200', period: '8' }],
    })).toThrow('não corresponde a uma ocorrência')
  })

  it('rejeita substituições duplicadas no mesmo período', () => {
    expect(() => buildFinancingFromForm({
      ...createFinancingFormState(),
      price: '80.000',
      ratePercent: '1',
      termMonths: '24',
      recurringEnabled: true,
      recurringAmount: '100',
      recurringStartPeriod: '2',
      recurringFrequencyMonths: '2',
      manualReplacements: [
        { key: 'manual-1', amount: '200', period: '4' },
        { key: 'manual-2', amount: '300', period: '4' },
      ],
    })).toThrow('mais de uma substituição no período 4')
  })

  it('recria o formulário sem persistir resultados calculados', () => {
    const financing = buildFinancingFromForm({
      ...createFinancingFormState(),
      price: '50.000',
      ratePercent: '2',
      termMonths: '12',
    })
    const form = createFinancingFormState(financing)
    expect(form.ratePercent).toBe('2')
    expect(JSON.stringify(form)).not.toContain('schedule')
  })
})
