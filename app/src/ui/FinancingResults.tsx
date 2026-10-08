import type { CandidateFinancingResult } from '../application/appState'
import { calculateAmortizationImpact } from '../application/financingLab'
import type { ComparedPriceScenario } from '../domain/financing'
import {
  formatCurrency,
  formatDecimalPercentage,
  formatNumber,
} from './format'
import { strategyLabels } from './FinancingForm'
import { FinancingLab } from './FinancingLab'

function StrategyCard({ scenario, baseline }: {
  readonly scenario: ComparedPriceScenario
  readonly baseline: ComparedPriceScenario
}) {
  const impact = calculateAmortizationImpact(baseline, scenario)
  const isBaseline = scenario.strategy === 'none'
  return (
    <article className={`strategy-card ${isBaseline ? 'strategy-card-baseline' : ''}`}>
      <span className="tag">{isBaseline ? 'Referência' : 'Com amortização'}</span>
      <h3>{strategyLabels[scenario.strategy]}</h3>
      <dl className="metric-list">
        <div><dt>Prestação inicial</dt><dd>{formatCurrency(scenario.initialPayment)}</dd></div>
        <div><dt>Juros totais</dt><dd>{formatCurrency(scenario.totalInterest)}</dd></div>
        <div><dt>Economia de juros</dt><dd>{formatCurrency(impact.interestSavings)}</dd></div>
        <div><dt>Economia percentual de juros</dt><dd>{formatDecimalPercentage(impact.interestSavingsPercentage)}</dd></div>
        <div><dt>Total desembolsado</dt><dd>{formatCurrency(scenario.totalDisbursed)}</dd></div>
        <div><dt>Economia total</dt><dd>{formatCurrency(impact.totalDisbursedSavings)}</dd></div>
        <div><dt>Aportes aplicados</dt><dd>{formatCurrency(scenario.totalExtraPayments)}</dd></div>
        <div><dt>Prazo efetivo</dt><dd>{formatNumber(scenario.effectiveTermMonths)} meses</dd></div>
        <div><dt>Meses antecipados</dt><dd>{formatNumber(scenario.monthsSaved)}</dd></div>
        <div><dt>Quitação</dt><dd>Período {scenario.payoffPeriod}</dd></div>
      </dl>
    </article>
  )
}

export function FinancingResults({ result }: { readonly result: CandidateFinancingResult }) {
  const baseline = result.comparison.none
  return (
    <div className="screen-stack results-stack">
      <section>
        <div className="section-heading">
          <div><span className="eyebrow">Resultado principal</span><h2>Comparação das estratégias</h2><p className="field-help">Mesmas entradas para {result.candidate.vehicle.name} · valor financiado {formatCurrency(result.financedAmount.amount)}.</p></div>
        </div>
        <div className="strategy-grid">
          <StrategyCard scenario={result.comparison.none} baseline={baseline} />
          <StrategyCard scenario={result.comparison.reducePayment} baseline={baseline} />
          <StrategyCard scenario={result.comparison.reduceTerm} baseline={baseline} />
        </div>
        <p className="field-help">Aportes amortizam o principal e já estão contidos no total desembolsado; não são somados novamente como custo.</p>
      </section>

      <FinancingLab result={result} />
    </div>
  )
}
