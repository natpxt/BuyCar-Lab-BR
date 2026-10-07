const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentValueFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const perKmFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatDecimalPercentage(value: number): string {
  return percentFormatter.format(value)
}

export function formatPercentageValue(value: number | null): string {
  return value === null ? 'Não disponível' : `${percentValueFormatter.format(value)}%`
}

export function formatCostPerKm(value: number): string {
  return `${perKmFormatter.format(value)}/km`
}

export function formatOperationalHeadline(
  vehicleName: string,
  monthlySavings: number,
): string {
  if (monthlySavings > 0) {
    return `${vehicleName} é ${formatCurrency(monthlySavings)} mais barato por mês`
  }
  if (monthlySavings < 0) {
    return `${vehicleName} custa ${formatCurrency(Math.abs(monthlySavings))} a mais por mês`
  }
  return `${vehicleName} tem o mesmo custo operacional mensal`
}

export function formatSignedMonthlyCurrency(value: number): string {
  if (value > 0) {
    return `+ ${formatCurrency(value)}/mês`
  }
  if (value < 0) {
    return `- ${formatCurrency(Math.abs(value))}/mês`
  }
  return `${formatCurrency(0)}/mês`
}

export function formatOperationalComparisonLabel(
  currentVehicleName: string,
  monthlySavings: number,
): string {
  return monthlySavings >= 0
    ? `Economia em relação ao ${currentVehicleName}`
    : `Custo adicional em relação ao ${currentVehicleName}`
}

export function parsePtBrNumber(value: string, field: string): number {
  const normalized = value
    .trim()
    .replace(/R\$/gi, '')
    .replace(/%/g, '')
    .replace(/\s/g, '')
  if (normalized.length === 0) {
    throw new Error(`${field} é obrigatório`)
  }

  const decimal = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : /^-?\d{1,3}(\.\d{3})+$/.test(normalized)
      ? normalized.replace(/\./g, '')
      : normalized
  const number = Number(decimal)
  if (!Number.isFinite(number)) {
    throw new Error(`${field} deve ser um número válido`)
  }
  return number
}

export function parseOptionalPtBrNumber(
  value: string,
  field: string,
): number | undefined {
  return value.trim().length === 0 ? undefined : parsePtBrNumber(value, field)
}

export function percentageInputToDecimal(value: string, field: string): number {
  return parsePtBrNumber(value, field) / 100
}

export function decimalToPercentageInput(value: number): string {
  return String(value * 100).replace('.', ',')
}

export function numberToInput(value: number | undefined): string {
  return value === undefined ? '' : String(value).replace('.', ',')
}
