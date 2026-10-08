import { useEffect, useState, type FormEvent } from 'react'
import type { CandidateFinancingInput } from '../application/appState'
import type { ExtraPaymentStrategy } from '../domain/financing'
import {
  buildFinancingFromForm,
  createFinancingFormState,
  type FinancingFormState,
  type ManualReplacementRow,
  type OneTimePaymentRow,
  type PeriodicChargeRow,
} from './financingFormModel'
import { CurrencyInput } from './CurrencyInput'

interface FinancingFormProps {
  readonly candidateId: string
  readonly initialValue?: CandidateFinancingInput
  readonly suggestedPrice: number
  onSave(value: CandidateFinancingInput): void
}

const strategyLabels: Record<ExtraPaymentStrategy, string> = {
  none: 'Sem amortização extraordinária',
  reducePayment: 'Reduzir parcela',
  reduceTerm: 'Reduzir prazo',
}

function rowKey(): string {
  return crypto.randomUUID()
}

interface InputProps {
  readonly label: string
  readonly value: string
  readonly suffix?: string
  readonly placeholder?: string
  onChange(value: string): void
}

function Input({ label, value, suffix, placeholder, onChange }: InputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-with-suffix">
        <input value={value} placeholder={placeholder} inputMode="decimal" onChange={(event) => onChange(event.target.value)} />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  )
}

export function FinancingForm({
  candidateId,
  initialValue,
  suggestedPrice,
  onSave,
}: FinancingFormProps) {
  const [form, setForm] = useState(() => createFinancingFormState(initialValue, suggestedPrice))
  const [error, setError] = useState<string | null>(null)
  const [choosingAmortization, setChoosingAmortization] = useState(false)

  useEffect(() => {
    setForm(createFinancingFormState(initialValue, suggestedPrice))
    setError(null)
    setChoosingAmortization(false)
  }, [candidateId, initialValue, suggestedPrice])

  const update = <K extends keyof FinancingFormState>(field: K, value: FinancingFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }
  const updateRow = <T extends { readonly key: string }>(
    rows: readonly T[],
    key: string,
    patch: Partial<T>,
  ): readonly T[] => rows.map((row) => row.key === key ? { ...row, ...patch } : row)

  const toggleRecurring = (enabled: boolean) => {
    setForm((current) => ({
      ...current,
      recurringEnabled: enabled,
      manualReplacements: enabled ? current.manualReplacements : [],
    }))
  }

  const addRecurringPlan = () => {
    if (form.recurringEnabled) {
      setError('Somente um plano de amortização recorrente é suportado atualmente')
      setChoosingAmortization(false)
      return
    }
    setForm((current) => ({
      ...current,
      recurringEnabled: true,
      recurringFrequencyMonths: current.recurringFrequencyMonths || '1',
    }))
    setError(null)
    setChoosingAmortization(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      onSave(buildFinancingFromForm(form))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Configuração de financiamento inválida')
    }
  }

  return (
    <form className="editor-card financing-form" onSubmit={submit}>
      {error && <div className="alert alert-error">{error}</div>}

      <fieldset>
        <legend>Compra</legend>
        <div className="form-grid form-grid-four">
          <CurrencyInput label="Preço" value={form.price} onChange={(value) => update('price', value)} />
          <CurrencyInput label="Valor de troca" value={form.tradeInValue} onChange={(value) => update('tradeInValue', value)} />
          <CurrencyInput label="Entrada adicional" value={form.additionalDownPayment} onChange={(value) => update('additionalDownPayment', value)} />
          <CurrencyInput label="Custos financiados" value={form.financedCosts} onChange={(value) => update('financedCosts', value)} />
        </div>
        {form.price.trim() ? (
          <p className="field-help">O valor financiado será calculado automaticamente com preço, troca, entrada e custos financiados.</p>
        ) : (
          <div className="form-grid">
            <CurrencyInput label="Valor financiado manual" value={form.manualAmount} onChange={(value) => update('manualAmount', value)} />
            <p className="field-help">Fallback usado somente porque o preço não foi informado.</p>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Contrato PRICE</legend>
        <div className="form-grid">
          <Input label="Taxa efetiva" suffix="%" value={form.ratePercent} onChange={(value) => update('ratePercent', value)} />
          <label className="field"><span>Periodicidade</span><select value={form.ratePeriodicity} onChange={(event) => update('ratePeriodicity', event.target.value as FinancingFormState['ratePeriodicity'])}><option value="monthly">Mensal</option><option value="annual">Anual</option></select></label>
          <Input label="Prazo" suffix="meses" value={form.termMonths} onChange={(value) => update('termMonths', value)} />
          <label className="field field-wide"><span>Estratégia selecionada</span><select value={form.strategy} onChange={(event) => update('strategy', event.target.value as ExtraPaymentStrategy)}>{Object.entries(strategyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
      </fieldset>

      <fieldset>
        <div className="fieldset-heading">
          <div><legend>Planos de amortização</legend><p className="field-help">Combine amortizações únicas com um plano recorrente.</p></div>
          <button type="button" className="button button-small button-secondary" onClick={() => setChoosingAmortization((current) => !current)}>Adicionar amortização</button>
        </div>

        {choosingAmortization && (
          <div className="amortization-type-picker" role="group" aria-label="Tipo de amortização">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                update('oneTimePayments', [
                  ...form.oneTimePayments,
                  { key: rowKey(), amount: '', period: '' },
                ])
                setChoosingAmortization(false)
              }}
            >
              Única
            </button>
            <button type="button" className="button button-secondary" onClick={addRecurringPlan}>Recorrente</button>
          </div>
        )}

        {form.oneTimePayments.length === 0 && !form.recurringEnabled && (
          <p className="field-help">Nenhuma amortização extra cadastrada.</p>
        )}

        <div className="amortization-plan-list">
          {form.oneTimePayments.map((row) => (
            <article className="amortization-plan" key={row.key}>
              <div className="plan-heading"><div><span className="tag">Única</span><strong>Amortização em uma parcela</strong></div><button type="button" className="button button-small button-danger" onClick={() => update('oneTimePayments', form.oneTimePayments.filter((item) => item.key !== row.key))}>Excluir</button></div>
              <div className="form-grid">
                <CurrencyInput label="Valor" value={row.amount} onChange={(amount) => update('oneTimePayments', updateRow<OneTimePaymentRow>(form.oneTimePayments, row.key, { amount }))} />
                <Input label="Parcela" value={row.period} onChange={(period) => update('oneTimePayments', updateRow<OneTimePaymentRow>(form.oneTimePayments, row.key, { period }))} />
              </div>
            </article>
          ))}

          {form.recurringEnabled && (
            <article className="amortization-plan amortization-plan-recurring">
              <div className="plan-heading"><div><span className="tag">Recorrente</span><strong>Amortização em intervalos regulares</strong></div><button type="button" className="button button-small button-danger" onClick={() => toggleRecurring(false)}>Excluir</button></div>
              <div className="form-grid form-grid-four">
                <CurrencyInput label="Valor" value={form.recurringAmount} onChange={(value) => update('recurringAmount', value)} />
                <Input label="Primeira parcela" value={form.recurringStartPeriod} onChange={(value) => update('recurringStartPeriod', value)} />
                <Input label="Última parcela (opcional)" value={form.recurringEndPeriod} onChange={(value) => update('recurringEndPeriod', value)} />
                <Input label="Frequência" suffix="meses" value={form.recurringFrequencyMonths} onChange={(value) => update('recurringFrequencyMonths', value)} />
              </div>

              <div className="plan-exceptions">
                <div className="fieldset-heading"><div><strong>Exceções do plano recorrente</strong><p className="field-help">Cada exceção substitui o valor somente naquela ocorrência.</p></div><button type="button" className="button button-small button-secondary" onClick={() => update('manualReplacements', [...form.manualReplacements, { key: rowKey(), amount: '', period: '' }])}>Adicionar exceção</button></div>
                <div className="repeat-list">
                  {form.manualReplacements.map((row) => (
                    <div className="repeat-row" key={row.key}>
                      <Input label="Parcela da ocorrência" value={row.period} onChange={(period) => update('manualReplacements', updateRow<ManualReplacementRow>(form.manualReplacements, row.key, { period }))} />
                      <CurrencyInput label="Novo valor" value={row.amount} onChange={(amount) => update('manualReplacements', updateRow<ManualReplacementRow>(form.manualReplacements, row.key, { amount }))} />
                      <button type="button" className="button button-small button-danger" onClick={() => update('manualReplacements', form.manualReplacements.filter((item) => item.key !== row.key))}>Remover</button>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          )}
        </div>
      </fieldset>

      <fieldset>
        <div className="fieldset-heading"><legend>Cobranças periódicas</legend><button type="button" className="button button-small button-secondary" onClick={() => update('periodicCharges', [...form.periodicCharges, { key: rowKey(), description: '', amount: '', startPeriod: '', endPeriod: '', frequencyMonths: '1' }])}>Adicionar cobrança</button></div>
        {form.periodicCharges.length === 0 && <p className="field-help">Seguros e tarifas entram no desembolso sem aumentar o principal.</p>}
        <div className="repeat-list">
          {form.periodicCharges.map((row) => (
            <div className="repeat-row repeat-row-charge" key={row.key}>
              <label className="field"><span>Descrição</span><input value={row.description} placeholder="Seguro" onChange={(event) => update('periodicCharges', updateRow<PeriodicChargeRow>(form.periodicCharges, row.key, { description: event.target.value }))} /></label>
              <CurrencyInput label="Valor" value={row.amount} onChange={(amount) => update('periodicCharges', updateRow<PeriodicChargeRow>(form.periodicCharges, row.key, { amount }))} />
              <Input label="Início" value={row.startPeriod} onChange={(startPeriod) => update('periodicCharges', updateRow<PeriodicChargeRow>(form.periodicCharges, row.key, { startPeriod }))} />
              <Input label="Fim (opcional)" value={row.endPeriod} onChange={(endPeriod) => update('periodicCharges', updateRow<PeriodicChargeRow>(form.periodicCharges, row.key, { endPeriod }))} />
              <Input label="Frequência" value={row.frequencyMonths} onChange={(frequencyMonths) => update('periodicCharges', updateRow<PeriodicChargeRow>(form.periodicCharges, row.key, { frequencyMonths }))} />
              <button type="button" className="button button-small button-danger" onClick={() => update('periodicCharges', form.periodicCharges.filter((item) => item.key !== row.key))}>Remover</button>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="form-actions"><button className="button button-primary" type="submit">Salvar e calcular financiamento</button></div>
    </form>
  )
}

export { strategyLabels }
