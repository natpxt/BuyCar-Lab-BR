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

  useEffect(() => {
    setForm(createFinancingFormState(initialValue, suggestedPrice))
    setError(null)
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
          <Input label="Preço" suffix="R$" value={form.price} onChange={(value) => update('price', value)} />
          <Input label="Valor de troca" suffix="R$" value={form.tradeInValue} onChange={(value) => update('tradeInValue', value)} />
          <Input label="Entrada adicional" suffix="R$" value={form.additionalDownPayment} onChange={(value) => update('additionalDownPayment', value)} />
          <Input label="Custos financiados" suffix="R$" value={form.financedCosts} onChange={(value) => update('financedCosts', value)} />
        </div>
        {form.price.trim() ? (
          <p className="field-help">O valor financiado será calculado automaticamente com preço, troca, entrada e custos financiados.</p>
        ) : (
          <div className="form-grid">
            <Input label="Valor financiado manual" suffix="R$" value={form.manualAmount} onChange={(value) => update('manualAmount', value)} />
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
        <div className="fieldset-heading"><legend>Aportes únicos</legend><button type="button" className="button button-small button-secondary" onClick={() => update('oneTimePayments', [...form.oneTimePayments, { key: rowKey(), amount: '', period: '' }])}>Adicionar aporte</button></div>
        {form.oneTimePayments.length === 0 && <p className="field-help">Nenhum aporte único cadastrado.</p>}
        <div className="repeat-list">
          {form.oneTimePayments.map((row) => (
            <div className="repeat-row" key={row.key}>
              <Input label="Valor" suffix="R$" value={row.amount} onChange={(amount) => update('oneTimePayments', updateRow<OneTimePaymentRow>(form.oneTimePayments, row.key, { amount }))} />
              <Input label="Período" value={row.period} onChange={(period) => update('oneTimePayments', updateRow<OneTimePaymentRow>(form.oneTimePayments, row.key, { period }))} />
              <button type="button" className="button button-small button-danger" onClick={() => update('oneTimePayments', form.oneTimePayments.filter((item) => item.key !== row.key))}>Remover</button>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <label className="check-field"><input type="checkbox" checked={form.recurringEnabled} onChange={(event) => toggleRecurring(event.target.checked)} /><span>Ativar aporte recorrente</span></label>
        {form.recurringEnabled && <div className="form-grid form-grid-four"><Input label="Valor" suffix="R$" value={form.recurringAmount} onChange={(value) => update('recurringAmount', value)} /><Input label="Período inicial" value={form.recurringStartPeriod} onChange={(value) => update('recurringStartPeriod', value)} /><Input label="Período final (opcional)" value={form.recurringEndPeriod} onChange={(value) => update('recurringEndPeriod', value)} /><Input label="Frequência" suffix="meses" value={form.recurringFrequencyMonths} onChange={(value) => update('recurringFrequencyMonths', value)} /></div>}
      </fieldset>

      <fieldset>
        <div className="fieldset-heading"><legend>Substituições manuais</legend>{form.recurringEnabled && <button type="button" className="button button-small button-secondary" onClick={() => update('manualReplacements', [...form.manualReplacements, { key: rowKey(), amount: '', period: '' }])}>Adicionar substituição</button>}</div>
        {!form.recurringEnabled && <p className="field-help">Ative o aporte recorrente para substituir o valor de uma ocorrência específica.</p>}
        {form.recurringEnabled && (
          <>
            {form.manualReplacements.length === 0 && <p className="field-help">A substituição altera somente uma ocorrência válida do aporte recorrente.</p>}
            <div className="repeat-list">
              {form.manualReplacements.map((row) => <div className="repeat-row" key={row.key}><Input label="Período da ocorrência" value={row.period} onChange={(period) => update('manualReplacements', updateRow<ManualReplacementRow>(form.manualReplacements, row.key, { period }))} /><Input label="Novo valor" suffix="R$" value={row.amount} onChange={(amount) => update('manualReplacements', updateRow<ManualReplacementRow>(form.manualReplacements, row.key, { amount }))} /><button type="button" className="button button-small button-danger" onClick={() => update('manualReplacements', form.manualReplacements.filter((item) => item.key !== row.key))}>Remover</button></div>)}
            </div>
          </>
        )}
      </fieldset>

      <fieldset>
        <div className="fieldset-heading"><legend>Cobranças periódicas</legend><button type="button" className="button button-small button-secondary" onClick={() => update('periodicCharges', [...form.periodicCharges, { key: rowKey(), description: '', amount: '', startPeriod: '', endPeriod: '', frequencyMonths: '1' }])}>Adicionar cobrança</button></div>
        {form.periodicCharges.length === 0 && <p className="field-help">Seguros e tarifas entram no desembolso sem aumentar o principal.</p>}
        <div className="repeat-list">
          {form.periodicCharges.map((row) => (
            <div className="repeat-row repeat-row-charge" key={row.key}>
              <label className="field"><span>Descrição</span><input value={row.description} placeholder="Seguro" onChange={(event) => update('periodicCharges', updateRow<PeriodicChargeRow>(form.periodicCharges, row.key, { description: event.target.value }))} /></label>
              <Input label="Valor" suffix="R$" value={row.amount} onChange={(amount) => update('periodicCharges', updateRow<PeriodicChargeRow>(form.periodicCharges, row.key, { amount }))} />
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
