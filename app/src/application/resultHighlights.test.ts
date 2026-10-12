import { describe, expect, it } from 'vitest'
import { findUniqueLowestMetricId } from './resultHighlights'

describe('destaque visual de resultado', () => {
  it('destaca somente o menor valor real', () => {
    expect(findUniqueLowestMetricId([{ id: 'a', value: 200 }, { id: 'b', value: 100 }])).toBe('b')
  })
  it('preserva empate exato sem selo de vencedor', () => {
    expect(findUniqueLowestMetricId([{ id: 'a', value: 100 }, { id: 'b', value: 100 }])).toBeNull()
  })
  it('preserva empate dentro da tolerância monetária', () => {
    expect(findUniqueLowestMetricId([{ id: 'a', value: 100 }, { id: 'b', value: 100.004 }])).toBeNull()
  })
  it('não cria comparação com um resultado só ou vazio', () => {
    expect(findUniqueLowestMetricId([])).toBeNull()
    expect(findUniqueLowestMetricId([{ id: 'a', value: 100 }])).toBeNull()
  })
  it('não destaca uma comparação inválida', () => {
    expect(findUniqueLowestMetricId([{ id: 'a', value: 100 }, { id: 'b', value: NaN }])).toBeNull()
    expect(findUniqueLowestMetricId([{ id: 'a', value: 100 }, { id: 'b', value: Infinity }])).toBeNull()
  })
  it('compara impactos negativos sem mutar os dados', () => {
    const metrics = Object.freeze([Object.freeze({ id: 'a', value: -200 }), Object.freeze({ id: 'b', value: -100 })])
    expect(findUniqueLowestMetricId(metrics)).toBe('a')
    expect(findUniqueLowestMetricId(metrics)).toBe('a')
    expect(metrics.map((metric) => metric.value)).toEqual([-200, -100])
  })
})
