import { describe, expect, it } from 'vitest'
import {
  decimalToPercentageInput,
  formatCostPerKm,
  formatCurrency,
  formatCurrencyInput,
  formatDecimalPercentage,
  formatOperationalComparisonLabel,
  formatOperationalHeadline,
  formatSignedMonthlyCurrency,
  numberToCurrencyInput,
  parseCurrencyInput,
  parsePtBrNumber,
  percentageInputToDecimal,
} from './format'

describe('helpers de apresentação', () => {
  it('converte números digitados em pt-BR', () => {
    expect(parsePtBrNumber('1.234,56', 'valor')).toBe(1_234.56)
    expect(parsePtBrNumber('1,7%', 'taxa')).toBe(1.7)
  })

  it.each([
    ['1000', '1.000'],
    ['120000', '120.000'],
    ['120000,5', '120.000,5'],
    ['120000,50', '120.000,50'],
    ['120.000,50', '120.000,50'],
    ['R$ 120.000,50', '120.000,50'],
  ])('formata entrada monetária %s como %s', (input, expected) => {
    expect(formatCurrencyInput(input)).toBe(expected)
  })

  it.each([
    ['120.000', 120_000],
    ['120.000,50', 120_000.5],
    ['6,59', 6.59],
    ['174,08', 174.08],
    ['70.000', 70_000],
    ['10.000', 10_000],
  ])('converte entrada monetária %s para %s', (input, expected) => {
    expect(parseCurrencyInput(input)).toBe(expected)
  })

  it('mantém a entrada monetária vazia sem convertê-la em zero', () => {
    expect(formatCurrencyInput('')).toBe('')
    expect(parseCurrencyInput('')).toBeUndefined()
  })

  it('limita a entrada monetária a duas casas decimais', () => {
    expect(formatCurrencyInput('1.234,5678')).toBe('1.234,56')
  })

  it('mantém ponto como separador de milhar durante a edição', () => {
    expect(formatCurrencyInput('1.00')).toBe('100')
  })

  it('faz round-trip de número para input monetário e número', () => {
    expect(parseCurrencyInput(numberToCurrencyInput(120_000.5))).toBe(120_000.5)
  })

  it('converte porcentagem visual e decimal nos dois sentidos', () => {
    expect(percentageInputToDecimal('1,7', 'taxa')).toBe(0.017)
    expect(decimalToPercentageInput(0.03)).toBe('3')
  })

  it('formata moeda, percentual e custo por km em pt-BR', () => {
    expect(formatCurrency(2_451.51)).toContain('2.451,51')
    expect(formatDecimalPercentage(0.017)).toBe('1,70%')
    expect(formatCostPerKm(0.5274)).toContain('0,527')
    expect(formatCostPerKm(0.5274).endsWith('/km')).toBe(true)
  })

  it('usa o nome real do veículo na frase operacional', () => {
    expect(formatOperationalHeadline('Dolphin Mini', 1_696.02)).toBe(
      'Dolphin Mini é R$ 1.696,02 mais barato por mês',
    )
    expect(formatOperationalHeadline('Dolphin Mini', -230)).toBe(
      'Dolphin Mini custa R$ 230,00 a mais por mês',
    )
    expect(formatOperationalHeadline('Dolphin Mini', 0)).toBe(
      'Dolphin Mini tem o mesmo custo operacional mensal',
    )
  })

  it('formata impacto mensal com sinal explícito', () => {
    expect(formatSignedMonthlyCurrency(450)).toContain('+ R$')
    expect(formatSignedMonthlyCurrency(-230)).toContain('- R$')
    expect(formatSignedMonthlyCurrency(0)).toContain('R$')
  })

  it('usa o nome atual no label comparativo', () => {
    expect(formatOperationalComparisonLabel('Tiida', 230)).toBe(
      'Economia em relação ao Tiida',
    )
    expect(formatOperationalComparisonLabel('Tiida', -230)).toBe(
      'Custo adicional em relação ao Tiida',
    )
  })
})
