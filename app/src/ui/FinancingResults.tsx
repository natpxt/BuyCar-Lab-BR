import type {
  CandidateFinancingInput,
  CandidateFinancingResult,
} from '../application/appState'
import { calculateAmortizationImpact } from '../application/financingLab'
import type { ComparedPriceScenario } from '../domain/financing'
import {
  formatCurrency,
  formatDecimalPercentage,
  formatNumber,
} from './format'
import { strategyLabels } from './FinancingForm'
import { FinancingLab } from './FinancingLab'
import { findUniqueLowestMetricId } from '../application/resultHighlights'
import { OutcomeBadge } from './OutcomeBadge'
import { CircleMinus, Timer, TrendingDown } from 'lucide-react'
import { AppIcon } from './AppIcon'

export function FinancingLiveSummary({
  result,
  financing,
}: {
  readonly result: CandidateFinancingResult
  readonly financing?: CandidateFinancingInput
}) {
  const scenario = result.selectedScenario
  const rateLabel = financing
    ? `${formatDecimalPercentage(financing.rate.value)} ${financing.rate.periodicity === 'monthly' ? 'ao mês' : 'ao ano'}`
    : '—'
  return (
    <section className="financing-live-summary">
      <div className="financing-live-identity">
        <span className="eyebrow">Veículo financiado</span>
        <h3>{result.candidate.vehicle.name}</h3>
        <span><AppIcon icon={{ none: CircleMinus, reducePayment: TrendingDown, reduceTerm: Timer }[scenario.strategy]} size={16} />{strategyLabels[scenario.strategy]}</span>
      </div>
      <div className="financing-live-amount">
        <span>Valor financiado</span>
        <strong>{formatCurrency(result.financedAmount.amount)}</strong>
        <small>{result.financedAmount.source === 'calculated'
          ? 'Calculado a partir da compra'
          : 'Principal informado manualmente'}</small>
      </div>
      <div className="financing-live-key-metrics">
        <div><span>Prestação inicial</span><strong>{formatCurrency(scenario.initialPayment)}</strong></div>
        <div><span>Prazo efetivo</span><strong>{formatNumber(scenario.effectiveTermMonths)} meses</strong></div>
      </div>
      <dl className="financing-live-details">
        <div><dt>Taxa efetiva</dt><dd>{rateLabel}</dd></div>
        <div><dt>Aportes aplicados</dt><dd>{formatCurrency(scenario.totalExtraPayments)}</dd></div>
        <div><dt>Juros totais</dt><dd>{formatCurrency(scenario.totalInterest)}</dd></div>
        <div><dt>Total desembolsado</dt><dd>{formatCurrency(scenario.totalDisbursed)}</dd></div>
      </dl>
    </section>
  )
}
function StrategyCard({
  scenario,
  baseline,
  selected,
  winner,
}: {
  readonly scenario: ComparedPriceScenario
  readonly baseline: ComparedPriceScenario
  readonly selected: boolean
  readonly winner: boolean
}) {
  const impact = calculateAmortizationImpact(baseline, scenario)
  const isBaseline = scenario.strategy === 'none'
  return (
    <article className={`strategy-decision-card ${isBaseline ? 'strategy-card-baseline' : ''} ${selected ? 'strategy-card-selected' : ''} ${winner ? 'outcome-card-winner' : ''}`}>
      {winner && <OutcomeBadge>Menor total de juros</OutcomeBadge>}
      <header className="strategy-decision-heading">
        <div>
          <span className="tag">{isBaseline ? 'Sem aportes' : selected ? 'Estratégia salva' : 'Com amortização'}</span>
          <h3><AppIcon icon={{ none: CircleMinus, reducePayment: TrendingDown, reduceTerm: Timer }[scenario.strategy]} size={20} />{strategyLabels[scenario.strategy]}</h3>
        </div>
        {selected && <span className="strategy-selected-marker">Selecionada</span>}
      </header>
      <div className="strategy-decision-primary">
        <div><span>Juros totais</span><strong>{formatCurrency(scenario.totalInterest)}</strong></div>
        <div><span>Economia</span><strong className="metric-positive">{formatCurrency(impact.interestSavings)}</strong></div>
      </div>
      <div className="strategy-decision-total">
        <span>Total desembolsado</span>
        <strong>{formatCurrency(scenario.totalDisbursed)}</strong>
        <small>{formatCurrency(impact.totalDisbursedSavings)} de diferença para a referência</small>
      </div>
      <dl className="strategy-decision-details">
        <div><dt>Prestação inicial</dt><dd>{formatCurrency(scenario.initialPayment)}</dd></div>
        <div><dt>Economia percentual</dt><dd>{formatDecimalPercentage(impact.interestSavingsPercentage)}</dd></div>
        <div><dt>Aportes aplicados</dt><dd>{formatCurrency(scenario.totalExtraPayments)}</dd></div>
        <div><dt>Prazo efetivo</dt><dd>{formatNumber(scenario.effectiveTermMonths)} meses</dd></div>
        <div><dt>Meses antecipados</dt><dd>{formatNumber(scenario.monthsSaved)}</dd></div>
        <div><dt>Quitação</dt><dd>Período {scenario.payoffPeriod}</dd></div>
      </dl>
    </article>
  )
}

export function FinancingResults({ result }: {
  readonly result: CandidateFinancingResult
}) {
  const baseline = result.comparison.none
  const lowestInterestId = findUniqueLowestMetricId(Object.values(result.comparison)
    .map((scenario) => ({ id: scenario.strategy, value: scenario.totalInterest })))
  return (
    <div className="screen-stack results-stack financing-results-dashboard">
      <section className="financing-strategy-zone">
        <div className="dashboard-section-heading">
          <div>
            <span className="eyebrow">Estratégias do contrato</span>
            <h2>Comparação das estratégias</h2>
            <p>Mesmas entradas e o mesmo valor financiado para três formas de conduzir o contrato.</p>
          </div>
          <div className="financing-strategy-context">
            <span>Valor financiado</span>
            <strong>{formatCurrency(result.financedAmount.amount)}</strong>
          </div>
        </div>
        {lowestInterestId === null && <p className="strategy-tie-note">Empate em juros totais entre as estratégias de menor valor. Nenhum vencedor único.</p>}
        <div className="strategy-decision-grid">
          <StrategyCard scenario={result.comparison.none} baseline={baseline} selected={result.selectedScenario.strategy === 'none'} winner={lowestInterestId === 'none'} />
          <StrategyCard scenario={result.comparison.reducePayment} baseline={baseline} selected={result.selectedScenario.strategy === 'reducePayment'} winner={lowestInterestId === 'reducePayment'} />
          <StrategyCard scenario={result.comparison.reduceTerm} baseline={baseline} selected={result.selectedScenario.strategy === 'reduceTerm'} winner={lowestInterestId === 'reduceTerm'} />
        </div>
        <p className="field-help">Aportes amortizam o principal e já estão contidos no total desembolsado.</p>
      </section>

      <FinancingLab result={result} />
    </div>
  )
}
