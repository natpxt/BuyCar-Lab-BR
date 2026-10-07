import type { CandidateFinancingResult } from '../application/appState'
import type { ComparedPriceScenario } from '../domain/financing'
import { formatCurrency, formatNumber } from './format'
import { strategyLabels } from './FinancingForm'

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="result-metric"><span>{label}</span><strong>{value}</strong></div>
}

function StrategyCard({ scenario, baseline = false }: {
  readonly scenario: ComparedPriceScenario
  readonly baseline?: boolean
}) {
  return (
    <article className={`strategy-card ${baseline ? 'strategy-card-baseline' : ''}`}>
      <span className="tag">{baseline ? 'Referência' : 'Com aportes'}</span>
      <h3>{strategyLabels[scenario.strategy]}</h3>
      <dl className="metric-list">
        <div><dt>Prestação inicial</dt><dd>{formatCurrency(scenario.initialPayment)}</dd></div>
        <div><dt>Juros totais</dt><dd>{formatCurrency(scenario.totalInterest)}</dd></div>
        <div><dt>Total desembolsado</dt><dd>{formatCurrency(scenario.totalDisbursed)}</dd></div>
        <div><dt>Prazo efetivo</dt><dd>{formatNumber(scenario.effectiveTermMonths)} meses</dd></div>
        <div><dt>Economia de juros</dt><dd>{formatCurrency(scenario.interestSavings)}</dd></div>
        <div><dt>Meses antecipados</dt><dd>{formatNumber(scenario.monthsSaved)}</dd></div>
      </dl>
    </article>
  )
}

export function FinancingResults({ result }: { readonly result: CandidateFinancingResult }) {
  const selected = result.selectedScenario
  return (
    <div className="screen-stack results-stack">
      <section className="data-card">
        <div className="section-heading">
          <div><span className="eyebrow">Cenário selecionado</span><h2>{strategyLabels[selected.strategy]}</h2></div>
          <span className="tag">{result.candidate.vehicle.name}</span>
        </div>
        <div className="results-grid">
          <Metric label="Valor financiado" value={formatCurrency(result.financedAmount.amount)} />
          <Metric label="Prestação inicial" value={formatCurrency(selected.initialPayment)} />
          <Metric label="Juros totais" value={formatCurrency(selected.totalInterest)} />
          <Metric label="Aportes aplicados" value={formatCurrency(selected.totalExtraPayments)} />
          <Metric label="Cobranças periódicas" value={formatCurrency(selected.totalPeriodicCharges)} />
          <Metric label="Total desembolsado" value={formatCurrency(selected.totalDisbursed)} />
          <Metric label="Prazo original" value={`${selected.originalTermMonths} meses`} />
          <Metric label="Prazo efetivo" value={`${selected.effectiveTermMonths} meses`} />
          <Metric label="Quitação" value={`Período ${selected.payoffPeriod}`} />
        </div>
        <p className="field-help">Aportes amortizam o principal e já estão contidos no total desembolsado; não são somados novamente como custo.</p>
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">Mesmas entradas</span><h2>Comparação das estratégias</h2></div></div>
        <div className="strategy-grid">
          <StrategyCard scenario={result.comparison.none} baseline />
          <StrategyCard scenario={result.comparison.reducePayment} />
          <StrategyCard scenario={result.comparison.reduceTerm} />
        </div>
      </section>

      <section className="data-card">
        <div className="section-heading"><div><span className="eyebrow">Evolução mensal</span><h2>Cronograma do cenário selecionado</h2></div><span className="count-badge">{selected.schedule.length} períodos</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Período</th><th>Saldo inicial</th><th>Juros</th><th>Prestação</th><th>Principal</th><th>Aporte</th><th>Cobranças</th><th>Pagamento total</th><th>Saldo final</th></tr></thead>
            <tbody>
              {selected.schedule.map((entry) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
