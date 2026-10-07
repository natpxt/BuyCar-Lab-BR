import { describe, expect, it } from 'vitest'
import {
  decimalToPercentageInput,
  formatCostPerKm,
  formatCurrency,
  formatDecimalPercentage,
  formatOperationalComparisonLabel,
  formatOperationalHeadline,
  formatSignedMonthlyCurrency,
  parsePtBrNumber,
  percentageInputToDecimal,
} from './format'

describe('helpers de apresentação', () => {
  it('converte números digitados em pt-BR', () => {
    expect(parsePtBrNumber('1.234,56', 'valor')).toBe(1_234.56)
    expect(parsePtBrNumber('1,7%', 'taxa')).toBe(1.7)
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
