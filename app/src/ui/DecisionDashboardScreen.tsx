import { useState } from 'react'
import {
  calculateDecisionDashboard,
  decisionStrategyOrder,
  type DecisionDashboardResult,
  type DecisionStrategyMetrics,
} from '../application/decisionDashboard'
import { useAppState } from '../application/AppStateProvider'
import type { ExtraPaymentStrategy } from '../domain/financing'
import { strategyLabels } from './FinancingForm'
import {
  formatCostPerKm,
  formatCurrency,
  formatOperationalComparisonLabel,
  formatOperationalHeadline,
  formatSignedMonthlyCurrency,
} from './format'

function formatStrategyNames(
  strategies: readonly ExtraPaymentStrategy[],
): string {
  return strategies.map((strategy) => strategyLabels[strategy]).join(' · ')
}

function StrategyDecisionCard({ metrics }: {
  readonly metrics: DecisionStrategyMetrics
}) {
  return (
    <article className="strategy-card">
      <h3>{strategyLabels[metrics.strategy]}</h3>
      <dl className="metric-list">
        <div><dt>Prestação inicial</dt><dd>{formatCurrency(metrics.scenario.initialPayment)}</dd></div>
        <div><dt>Impacto líquido inicial</dt><dd>{formatSignedMonthlyCurrency(metrics.initialNetMonthlyImpact)}</dd></div>
        <div><dt>Juros totais</dt><dd>{formatCurrency(metrics.scenario.totalInterest)}</dd></div>
        <div><dt>Total desembolsado</dt><dd>{formatCurrency(metrics.scenario.totalDisbursed)}</dd></div>
        <div><dt>Prazo efetivo</dt><dd>{metrics.scenario.effectiveTermMonths} meses</dd></div>
        <div><dt>Meses antecipados</dt><dd>{metrics.scenario.monthsSaved}</dd></div>
        <div><dt>Economia de juros</dt><dd>{formatCurrency(metrics.scenario.interestSavings)}</dd></div>
      </dl>
    </article>
  )
}

function OperationalOverview({ result }: {
  readonly result: DecisionDashboardResult
}) {
  const optionName = result.comparison.candidate.vehicle.name
  const currentName = result.comparison.current.vehicle.name
  const isSaving = result.operationalSavingsMonthly >= 0
  return (
    <section className={`insight-card ${isSaving ? 'insight-positive' : 'insight-negative'}`}>
      <span className="eyebrow">Economia operacional</span>
      <h2>{formatOperationalHeadline(optionName, result.operationalSavingsMonthly)}</h2>
      <div className="insight-metrics">
        <div><span>TCO mensal do {currentName}</span><strong>{formatCurrency(result.currentMonthlyCashTco)}</strong></div>
        <div><span>TCO mensal do {optionName}</span><strong>{formatCurrency(result.optionMonthlyCashTco)}</strong></div>
        <div><span>{isSaving ? 'Economia anual' : 'Custo adicional anual'}</span><strong>{formatCurrency(Math.abs(result.operationalSavingsAnnual))}</strong></div>
        <div><span>Diferença por km</span><strong>{formatCostPerKm(Math.abs(result.operationalSavingsPerKm))}</strong></div>
      </div>
    </section>
  )
}

export function DecisionDashboardScreen() {
  const { state } = useAppState()
  const [optionId, setOptionId] = useState(() => (
    state.selectedFinancingCandidateId
    ?? state.selectedComparisonCandidateId
    ?? state.candidates[0]?.id
    ?? ''
  ))

  if (state.currentVehicle === null) {
    return <div className="empty-state page-empty"><h2>Cadastre o veículo atual</h2><p>O Ciladômetro precisa dessa referência para calcular o impacto da troca.</p></div>
  }
  if (state.candidates.length === 0) {
    return <div className="empty-state page-empty"><h2>Cadastre uma opção de troca</h2><p>Adicione ao menos um veículo para iniciar a análise final.</p></div>
  }

  let result: DecisionDashboardResult | null = null
  let error: string | null = null
  if (optionId) {
    try {
      result = calculateDecisionDashboard(state, optionId)
    } catch (cause) {
      error = cause instanceof Error
        ? cause.message
        : 'Não foi possível calcular o Ciladômetro'
    }
  }

  const selected = result?.selectedStrategy
  const optionName = result?.comparison.candidate.vehicle.name
  const currentName = result?.comparison.current.vehicle.name

  return (
    <div className="screen-stack decision-dashboard">
      <header className="page-header">
        <div>
          <span className="eyebrow">Decisão final</span>
          <h1>Ciladômetro</h1>
          <p>Veja o que a troca realmente muda no seu bolso, sem criar um índice arbitrário.</p>
        </div>
        <label className="field select-candidate">
          <span>Veículo analisado</span>
          <select value={optionId} onChange={(event) => setOptionId(event.target.value)}>
            <option value="">Selecione um veículo</option>
            {state.candidates.map((item) => <option key={item.id} value={item.id}>{item.vehicle.name}</option>)}
          </select>
        </label>
      </header>

      {!optionId && <div className="empty-state"><h2>Selecione uma opção de troca</h2><p>Escolha o veículo que deseja analisar.</p></div>}
      {error && <div className="alert alert-error">{error}</div>}
      {result && <OperationalOverview result={result} />}

      {result?.financing === null && (
        <div className="alert alert-info">
          Configure o financiamento deste veículo para completar a análise do Ciladômetro.
        </div>
      )}

      {result && selected && optionName && currentName && (
        <>
          <section className={`decision-hero ${selected.initialNetMonthlyImpact <= 0 ? 'decision-hero-saving' : ''}`}>
            <div>
              <span className="eyebrow">Cenário principal · {strategyLabels[selected.strategy]}</span>
              <h2>{optionName}</h2>
              <p>Impacto líquido mensal inicial</p>
              <strong>{formatSignedMonthlyCurrency(selected.initialNetMonthlyImpact)}</strong>
            </div>
            <div className="decision-hero-metrics">
              <div><span>{formatOperationalComparisonLabel(currentName, result.operationalSavingsMonthly)}</span><strong>{formatCurrency(Math.abs(result.operationalSavingsMonthly))}/mês</strong></div>
              <div><span>Parcela inicial</span><strong>{formatCurrency(selected.firstPeriodContractualPayment)}</strong></div>
              <div><span>Custo mensal depois de quitar</span><strong>{formatCurrency(result.optionMonthlyCashTco)}/mês</strong></div>
            </div>
          </section>

          <section className="data-card">
            <span className="eyebrow">Movimento de caixa</span>
            <h2>Primeiro período</h2>
            <dl className="metric-list">
              <div><dt>Pagamento total do financiamento</dt><dd>{formatCurrency(selected.firstPeriodTotalPayment)}</dd></div>
              <div><dt>Aporte extraordinário</dt><dd>{formatCurrency(selected.firstPeriodExtraPayment)}</dd></div>
              {selected.firstPeriodPeriodicCharges > 0 && <div><dt>Cobranças periódicas</dt><dd>{formatCurrency(selected.firstPeriodPeriodicCharges)}</dd></div>}
              <div><dt>Desembolso líquido do primeiro período</dt><dd>{formatSignedMonthlyCurrency(selected.firstPeriodNetDisbursementImpact)}</dd></div>
            </dl>
            <p className="field-help">O desembolso deste período pode incluir prestação, aporte e cobranças.</p>
          </section>

          <section>
            <div className="section-heading"><div><span className="eyebrow">Mesmas entradas</span><h2>Estratégias de financiamento</h2></div></div>
            <div className="strategy-grid">
              {decisionStrategyOrder.map((strategy) => (
                <StrategyDecisionCard key={strategy} metrics={result.strategies![strategy]} />
              ))}
            </div>
          </section>

          {result.highlights && (
            <section className="data-card">
              <div className="section-heading"><div><span className="eyebrow">Destaques por objetivo</span><h2>Escolha conforme sua prioridade</h2></div></div>
              <div className="decision-highlights">
                <div><span>Menor impacto no caixa</span><strong>{formatStrategyNames(result.highlights.lowestCashImpact)}</strong><small>Média mensal do desembolso enquanto o financiamento está ativo, compensada pela economia operacional.</small></div>
                <div><span>Menor custo total</span><strong>{formatStrategyNames(result.highlights.lowestTotalDisbursed)}</strong></div>
                <div><span>Quitação mais rápida</span><strong>{formatStrategyNames(result.highlights.fastestPayoff)}</strong></div>
                <div><span>Menor juros</span><strong>{formatStrategyNames(result.highlights.lowestInterest)}</strong></div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
