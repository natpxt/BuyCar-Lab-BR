import type { InputHTMLAttributes } from 'react'
import { formatCurrencyInput } from './format'

export interface CurrencyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'value' | 'onChange'
> {
  readonly label: string
  readonly value: string
  readonly suffix?: string
  onChange(value: string): void
}

export function CurrencyInput({
  label,
  value,
  suffix,
  onChange,
  ...inputProps
}: CurrencyInputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-with-affixes">
        <small className="input-prefix">R$</small>
        <input
          {...inputProps}
          type="text"
          inputMode="decimal"
          value={formatCurrencyInput(value)}
          onChange={(event) => onChange(formatCurrencyInput(event.target.value))}
        />
        {suffix && <small className="input-suffix">{suffix}</small>}
      </div>
    </label>
  )
}
