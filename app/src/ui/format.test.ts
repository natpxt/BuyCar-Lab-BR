import { describe, expect, it } from 'vitest'
import {
  decimalToPercentageInput,
  formatCostPerKm,
  formatCurrency,
  formatDecimalPercentage,
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
})
