import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CandidateFinancingResult } from '../application/appState'
import {
  aggregateScheduleAnnually,
  buildFinancingChartData,
  createAnnualCsvData,
  createMonthlyCsvData,
  filterAnnualSchedule,
  filterMonthlySchedule,
  getStrategyScenario,
  serializeCsv,
  type AmortizationTableScenario,
  type AmortizationTableView,
  type ScheduleRange,
} from '../application/financingLab'
import type {
  ExtraPaymentStrategy,
  PriceScheduleEntry,
} from '../domain/financing'
import { formatCurrency } from './format'
import { strategyLabels } from './FinancingForm'

function boundary(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value)
}

function chartCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

type VisualizationStrategy = Exclude<ExtraPaymentStrategy, 'none'>

function initialVisualizationStrategy(
  strategy: ExtraPaymentStrategy,
): VisualizationStrategy {
  return strategy === 'reduceTerm' ? 'reduceTerm' : 'reducePayment'
}

function FinancingCharts({ result }: {
  readonly result: CandidateFinancingResult
}) {
  const [strategy, setStrategy] = useState<VisualizationStrategy>(() => (
    initialVisualizationStrategy(result.selectedScenario.strategy)
  ))
  useEffect(() => {
    setStrategy(initialVisualizationStrategy(result.selectedScenario.strategy))
  }, [result.candidate.id])
  const scenario = getStrategyScenario(result.comparison, strategy)
  const data = useMemo(() => buildFinancingChartData(
    result.comparison.none,
    scenario,
  ), [result.comparison.none, scenario])

  return (
    <section>
      <div className="section-heading chart-section-heading">
        <div><span className="eyebrow">Evolução do contrato</span><h2>Visualizações</h2></div>
        <label className="field chart-strategy-select"><span>Estratégia visualizada</span><select value={strategy} onChange={(event) => setStrategy(event.target.value as VisualizationStrategy)}><option value="reducePayment">Reduzir parcela</option><option value="reduceTerm">Reduzir prazo</option></select></label>
      </div>
      <div className="chart-grid">
        <article className="data-card chart-card chart-card-wide">
          <h3>Saldo devedor</h3>
          <p className="field-help">Saldo final de cada período no baseline e em {strategyLabels[strategy].toLowerCase()}.</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dce4df" />
                <XAxis dataKey="period" interval="preserveStartEnd" minTickGap={28} />
                <YAxis width={72} tickFormatter={(value) => chartCurrency(Number(value))} />
                <Tooltip formatter={(value) => chartCurrency(Number(value))} labelFormatter={(label) => `Período ${label}`} />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="baselineBalance" name="Sem amortização" stroke="#68766e" dot={false} strokeWidth={2} connectNulls={false} />
                <Line type="monotone" dataKey="scenarioBalance" name={strategyLabels[strategy]} stroke="#1d6b50" dot={false} strokeWidth={3} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="data-card chart-card">
          <h3>Composição do pagamento</h3>
          <p className="field-help">Juros, amortização da parcela, aporte e cobranças de {strategyLabels[strategy].toLowerCase()}.</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dce4df" />
                <XAxis dataKey="period" interval="preserveStartEnd" minTickGap={28} />
                <YAxis width={72} tickFormatter={(value) => chartCurrency(Number(value))} />
                <Tooltip formatter={(value) => chartCurrency(Number(value))} labelFormatter={(label) => `Período ${label}`} />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <Bar dataKey="interest" name="Juros" stackId="payment" fill="#d7a93f" />
                <Bar dataKey="principal" name="Amortização da parcela" stackId="payment" fill="#4f9979" />
                <Bar dataKey="extraPayment" name="Aporte" stackId="payment" fill="#1d6b50" />
                <Bar dataKey="periodicCharges" name="Cobranças" stackId="payment" fill="#9aa79f" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="data-card chart-card">
          <h3>Evolução da prestação</h3>
          <p className="field-help">A linha termina quando o respectivo cenário é quitado.</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dce4df" />
                <XAxis dataKey="period" interval="preserveStartEnd" minTickGap={28} />
                <YAxis width={72} tickFormatter={(value) => chartCurrency(Number(value))} />
                <Tooltip formatter={(value) => chartCurrency(Number(value))} labelFormatter={(label) => `Período ${label}`} />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <Line type="stepAfter" dataKey="baselinePayment" name="Sem amortização" stroke="#68766e" dot={false} strokeWidth={2} connectNulls={false} />
                <Line type="stepAfter" dataKey="scenarioPayment" name={strategyLabels[strategy]} stroke="#1d6b50" dot={false} strokeWidth={3} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  )
}

function MonthlyRows({ entries }: {
  readonly entries: readonly PriceScheduleEntry[]
}) {
  return entries.map((entry) => (
    <tr key={entry.period}>
      <td>{entry.period}</td>
      <td>{formatCurrency(entry.openingBalance)}</td>
      <td>{formatCurrency(entry.interest)}</td>
      <td>{formatCurrency(entry.contractualPayment)}</td>
      <td>{formatCurrency(entry.principalAmortizedByPayment)}</td>
      <td>{formatCurrency(entry.extraPaymentApplied)}</td>
      <td title={entry.periodicCharges.map((charge) => charge.description).join(', ')}>{formatCurrency(entry.periodicChargeTotal)}</td>
      <td>{formatCurrency(entry.totalPayment)}</td>
      <td>{formatCurrency(entry.closingBalance)}</td>
    </tr>
  ))
}

function AmortizationTable({ result }: {
  readonly result: CandidateFinancingResult
}) {
  const [scenario, setScenario] = useState<AmortizationTableScenario>(() => (
    result.selectedScenario.strategy
  ))
  const [view, setView] = useState<AmortizationTableView>('monthly')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const schedule = getStrategyScenario(result.comparison, scenario).schedule
  const range: ScheduleRange = { start: boundary(start), end: boundary(end) }
  const annualSchedule = useMemo(
    () => aggregateScheduleAnnually(schedule),
    [schedule],
  )
  const table = useMemo(() => {
    try {
      return view === 'monthly'
        ? { monthly: filterMonthlySchedule(schedule, range), annual: null, error: null }
        : { monthly: null, annual: filterAnnualSchedule(annualSchedule, range), error: null }
    } catch (cause) {
      return {
        monthly: null,
        annual: null,
        error: cause instanceof Error ? cause.message : 'Filtro inválido',
      }
    }
  }, [annualSchedule, range.end, range.start, schedule, view])

  const downloadCsv = () => {
    try {
      const data = view === 'monthly'
        ? createMonthlyCsvData(schedule, range)
        : createAnnualCsvData(annualSchedule, range)
      const csv = `\ufeff${serializeCsv(data)}`
      const url = URL.createObjectURL(new Blob([csv], {
        type: 'text/csv;charset=utf-8',
      }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `financiamento-${strategyLabels[scenario].toLowerCase().replaceAll(' ', '-')}-${view === 'monthly' ? 'mensal' : 'anual'}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      return
    }
  }

  return (
    <section className="data-card">
      <div className="section-heading"><div><span className="eyebrow">Consulta e exportação</span><h2>Tabela de amortização</h2></div><button type="button" className="button button-secondary" onClick={downloadCsv} disabled={table.error !== null}>Baixar CSV</button></div>
      <div className="table-controls">
        <div className="table-scenario-control"><span className="control-label">Estratégia</span><div className="segmented-control"><button type="button" className={scenario === 'none' ? 'active' : ''} onClick={() => setScenario('none')}>Sem amortização</button><button type="button" className={scenario === 'reducePayment' ? 'active' : ''} onClick={() => setScenario('reducePayment')}>Reduzir parcela</button><button type="button" className={scenario === 'reduceTerm' ? 'active' : ''} onClick={() => setScenario('reduceTerm')}>Reduzir prazo</button></div></div>
        <div><span className="control-label">Visão</span><div className="segmented-control"><button type="button" className={view === 'monthly' ? 'active' : ''} onClick={() => { setView('monthly'); setStart(''); setEnd('') }}>Mensal</button><button type="button" className={view === 'annual' ? 'active' : ''} onClick={() => { setView('annual'); setStart(''); setEnd('') }}>Anual</button></div></div>
        <label className="field"><span>{view === 'monthly' ? 'Período inicial' : 'Ano inicial'}</span><input type="number" min="1" step="1" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label className="field"><span>{view === 'monthly' ? 'Período final' : 'Ano final'}</span><input type="number" min="1" step="1" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
      </div>
      {table.error && <div className="alert alert-error">{table.error}</div>}
      {!table.error && (
        <div className="table-scroll">
          <table className="amortization-table">
            <thead><tr><th>{view === 'monthly' ? 'Período' : 'Ano'}</th><th>Saldo inicial</th><th>Juros</th><th>{view === 'monthly' ? 'Prestação' : 'Prestações'}</th><th>Amortização da parcela</th><th>Aportes</th><th>Cobranças</th><th>Pagamento total</th><th>Saldo final</th></tr></thead>
            <tbody>
              {table.monthly && <MonthlyRows entries={table.monthly} />}
              {table.annual?.map((entry) => (
                <tr key={entry.year}>
                  <td>Ano {entry.year}</td>
                  <td>{formatCurrency(entry.openingBalance)}</td>
                  <td>{formatCurrency(entry.interest)}</td>
                  <td>{formatCurrency(entry.contractualPayment)}</td>
                  <td>{formatCurrency(entry.principalAmortizedByPayment)}</td>
                  <td>{formatCurrency(entry.extraPaymentApplied)}</td>
                  <td>{formatCurrency(entry.periodicChargeTotal)}</td>
                  <td>{formatCurrency(entry.totalPayment)}</td>
                  <td>{formatCurrency(entry.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function FinancingLab({ result }: {
  readonly result: CandidateFinancingResult
}) {
  return (
    <>
      <FinancingCharts result={result} />
      <AmortizationTable result={result} />
    </>
  )
}
