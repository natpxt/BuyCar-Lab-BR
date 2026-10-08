import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  calculateDecisionOptionsComparison,
  type ComparedDecisionOption,
  type DecisionDashboardResult,
} from '../application/decisionDashboard'
import { useAppState } from '../application/AppStateProvider'
import {
  initializeOptionSelection,
  reconcileOptionSelection,
} from '../application/multiVehicleSelection'
import type { ExtraPaymentStrategy } from '../domain/financing'
import { strategyLabels } from './FinancingForm'
import {
  formatCostPerKm,
  formatCurrency,
  formatOperationalComparisonLabel,
  formatOperationalHeadline,
  formatSignedMonthlyCurrency,
} from './format'
import { OptionMultiSelect } from './OptionMultiSelect'

function cashImpactMeaning(value: number): string {
  if (value > 0) return 'Custo adicional'
  if (value < 0) return 'Economia líquida'
  return 'Impacto neutro'
}

function CashImpactValue({ value, monthly = true }: {
  readonly value: number
  readonly monthly?: boolean
}) {
  const formatted = monthly
    ? formatSignedMonthlyCurrency(value)
    : value > 0
      ? `+ ${formatCurrency(value)}`
      : value < 0
        ? `- ${formatCurrency(Math.abs(value))}`
        : formatCurrency(0)
  return (
    <span className="cash-impact-value">
      <strong>{formatted}</strong>
      <small>{cashImpactMeaning(value)}</small>
    </span>
  )
}

function strategyRecommendationLabel(
  strategies: readonly ExtraPaymentStrategy[],
): string {
  if (strategies.length === 1) {
    return strategyLabels[strategies[0]]
  }
  return `Empate: ${strategies.map((strategy) => strategyLabels[strategy]).join(' · ')}`
}

function OptionCard({ option, children, className = '' }: {
  readonly option: ComparedDecisionOption
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <article className={`data-card decision-comparison-card ${className}`}>
      <span className="eyebrow">Opção de troca</span>
      <h3>{option.result.comparison.candidate.vehicle.name}</h3>
      {children}
    </article>
  )
}

function MissingFinancing() {
  return (
    <div className="alert alert-info decision-missing-financing">
      Configure o financiamento deste veículo para completar a análise financeira.
    </div>
  )
}

function OperationalCard({ result }: {
  readonly result: DecisionDashboardResult
}) {
  const optionName = result.comparison.candidate.vehicle.name
  const currentName = result.comparison.current.vehicle.name
  const isSaving = result.operationalSavingsMonthly >= 0
  return (
    <article className={`insight-card ${isSaving ? 'insight-positive' : 'insight-negative'}`}>
      <span className="eyebrow">{optionName}</span>
      <h3>{formatOperationalHeadline(optionName, result.operationalSavingsMonthly)}</h3>
      <dl className="metric-list">
        <div><dt>TCO mensal do {currentName}</dt><dd>{formatCurrency(result.currentMonthlyCashTco)}</dd></div>
        <div><dt>TCO mensal do {optionName}</dt><dd>{formatCurrency(result.optionMonthlyCashTco)}</dd></div>
        <div><dt>{isSaving ? 'Economia mensal' : 'Custo adicional mensal'}</dt><dd>{formatCurrency(Math.abs(result.operationalSavingsMonthly))}</dd></div>
        <div><dt>{isSaving ? 'Economia anual' : 'Custo adicional anual'}</dt><dd>{formatCurrency(Math.abs(result.operationalSavingsAnnual))}</dd></div>
        <div><dt>Diferença por km</dt><dd>{formatCostPerKm(Math.abs(result.operationalSavingsPerKm))}</dd></div>
      </dl>
    </article>
  )
}

function SummaryCard({ option }: { readonly option: ComparedDecisionOption }) {
  const result = option.result
  const recommended = result.recommendedStrategy
  const recommendation = result.recommendedStrategies
  const horizon = option.commonHorizonCashImpact

  return (
    <OptionCard option={option} className="decision-summary-card">
      {recommended === null || recommendation === null || horizon === null ? (
        <>
          <dl className="metric-list">
            <div><dt>{result.operationalSavingsMonthly >= 0 ? 'Economia operacional mensal' : 'Custo operacional adicional mensal'}</dt><dd>{formatCurrency(Math.abs(result.operationalSavingsMonthly))}</dd></div>
            <div><dt>Custo mensal após quitação</dt><dd>{formatCurrency(result.optionMonthlyCashTco)}</dd></div>
          </dl>
          <MissingFinancing />
        </>
      ) : (
        <dl className="metric-list">
          <div><dt>Estratégia recomendada</dt><dd>{strategyRecommendationLabel(recommendation)}</dd></div>
          <div><dt>Impacto no 1º mês</dt><dd><CashImpactValue value={horizon.firstPeriodImpact} /></dd></div>
          <div><dt>Impacto médio no horizonte</dt><dd><CashImpactValue value={horizon.averageImpact} /></dd></div>
          <div><dt>Impacto total no bolso</dt><dd><CashImpactValue value={horizon.cumulativeImpact} monthly={false} /></dd></div>
          <div><dt>Custo mensal após quitação</dt><dd>{formatCurrency(result.optionMonthlyCashTco)}</dd></div>
          <div><dt>Prazo efetivo</dt><dd>{recommended.scenario.effectiveTermMonths} meses</dd></div>
          <div><dt>Total desembolsado</dt><dd>{formatCurrency(recommended.scenario.totalDisbursed)}</dd></div>
          <div><dt>Juros totais</dt><dd>{formatCurrency(recommended.scenario.totalInterest)}</dd></div>
        </dl>
      )}
    </OptionCard>
  )
}

function MainScenarioCard({ option }: { readonly option: ComparedDecisionOption }) {
  const result = option.result
  const metrics = result.recommendedStrategy
  if (metrics === null) {
    return <OptionCard option={option}><MissingFinancing /></OptionCard>
  }
  return (
    <article className={`decision-hero decision-comparison-card ${metrics.firstPeriodNetDisbursementImpact <= 0 ? 'decision-hero-saving' : ''}`}>
      <div className="decision-hero-primary">
        <h3>{result.comparison.candidate.vehicle.name}</h3>
        <span className="decision-primary-label">Impacto no bolso no 1º mês</span>
        <CashImpactValue value={metrics.firstPeriodNetDisbursementImpact} />
      </div>
      <div className="decision-hero-metrics">
        <div><span>{formatOperationalComparisonLabel(result.comparison.current.vehicle.name, result.operationalSavingsMonthly)}</span><strong>{formatCurrency(Math.abs(result.operationalSavingsMonthly))}/mês</strong></div>
        <div><span>Parcela inicial</span><strong>{formatCurrency(metrics.firstPeriodContractualPayment)}</strong></div>
        <div><span>Aporte no 1º mês</span><strong>{formatCurrency(metrics.firstPeriodExtraPayment)}</strong></div>
        <div><span>Saída do financiamento no 1º mês</span><strong>{formatCurrency(metrics.firstPeriodTotalPayment)}</strong></div>
        <div><span>Custo mensal depois de quitar</span><strong>{formatCurrency(result.optionMonthlyCashTco)}/mês</strong></div>
      </div>
    </article>
  )
}

function FirstPeriodCard({ option }: { readonly option: ComparedDecisionOption }) {
  const result = option.result
  const metrics = result.recommendedStrategy
  if (metrics === null) {
    return <OptionCard option={option}><MissingFinancing /></OptionCard>
  }
  return (
    <OptionCard option={option}>
      <dl className="metric-list">
        <div><dt>Prestação contratual</dt><dd>{formatCurrency(metrics.firstPeriodContractualPayment)}</dd></div>
        <div><dt>Aporte aplicado</dt><dd>{formatCurrency(metrics.firstPeriodExtraPayment)}</dd></div>
        <div><dt>Cobranças</dt><dd>{formatCurrency(metrics.firstPeriodPeriodicCharges)}</dd></div>
        <div><dt>Pagamento total</dt><dd>{formatCurrency(metrics.firstPeriodTotalPayment)}</dd></div>
        <div><dt>{formatOperationalComparisonLabel(result.comparison.current.vehicle.name, result.operationalSavingsMonthly)}</dt><dd>{formatCurrency(Math.abs(result.operationalSavingsMonthly))}</dd></div>
        <div><dt>Impacto líquido real</dt><dd><CashImpactValue value={metrics.firstPeriodNetDisbursementImpact} /></dd></div>
      </dl>
    </OptionCard>
  )
}

function RealFlowCard({ option }: { readonly option: ComparedDecisionOption }) {
  const result = option.result
  const metrics = result.recommendedStrategy
  const horizon = option.commonHorizonCashImpact
  if (metrics === null || horizon === null) {
    return <OptionCard option={option}><MissingFinancing /></OptionCard>
  }
  return (
    <OptionCard option={option}>
      <dl className="metric-list">
        <div><dt>Impacto no 1º período</dt><dd><CashImpactValue value={horizon.firstPeriodImpact} /></dd></div>
        <div><dt>Impacto médio mensal</dt><dd><CashImpactValue value={horizon.averageImpact} /></dd></div>
        <div><dt>Maior impacto mensal</dt><dd><CashImpactValue value={horizon.maximumImpact} /></dd></div>
        <div><dt>Menor impacto mensal</dt><dd><CashImpactValue value={horizon.minimumImpact} /></dd></div>
        <div><dt>Impacto após quitação</dt><dd><CashImpactValue value={horizon.afterPayoffImpact} /></dd></div>
        <div><dt>Impacto total em {horizon.horizonMonths} meses</dt><dd><CashImpactValue value={horizon.cumulativeImpact} monthly={false} /></dd></div>
      </dl>
    </OptionCard>
  )
}

function ComparisonHighlights({ comparison }: {
  readonly comparison: ReturnType<typeof calculateDecisionOptionsComparison>
}) {
  if (
    comparison.options.length !== 2
    || comparison.comparisonHorizonMonths === null
    || comparison.lowestTotalImpactOptionIds === null
    || comparison.lowestFirstPeriodImpactOptionIds === null
  ) {
    return null
  }
  const nameFor = (id: string) => comparison.options.find(
    (option) => option.result.comparison.candidate.id === id,
  )?.result.comparison.candidate.vehicle.name ?? id
  const totalNames = comparison.lowestTotalImpactOptionIds.map(nameFor)
  const firstNames = comparison.lowestFirstPeriodImpactOptionIds.map(nameFor)
  return (
    <section className="data-card decision-comparison-highlights">
      <span className="eyebrow">Leitura objetiva</span>
      <h2>Comparação no mesmo horizonte</h2>
      <div className="decision-highlights">
        <div>
          <span>Menor impacto total no bolso</span>
          <strong>{totalNames.length > 1 ? `Empate: ${totalNames.join(' · ')}` : totalNames[0]}</strong>
          <small>{totalNames.length > 1 ? `Impactos equivalentes em ${comparison.comparisonHorizonMonths} meses.` : `${formatCurrency(comparison.totalImpactDifference ?? 0)} menos no horizonte de ${comparison.comparisonHorizonMonths} meses.`}</small>
        </div>
        <div>
          <span>Menor impacto no 1º mês</span>
          <strong>{firstNames.length > 1 ? `Empate: ${firstNames.join(' · ')}` : firstNames[0]}</strong>
          <small>{firstNames.length > 1 ? 'Impactos iniciais equivalentes.' : `${formatCurrency(comparison.firstPeriodImpactDifference ?? 0)} menos no primeiro mês.`}</small>
        </div>
      </div>
    </section>
  )
}

export function DecisionDashboardScreen() {
  const { state } = useAppState()
  const availableIds = useMemo(
    () => state.candidates.map((candidate) => candidate.id),
    [state.candidates],
  )
  const persistedId = state.selectedFinancingCandidateId
    ?? state.selectedComparisonCandidateId
  const [optionIds, setOptionIds] = useState<readonly string[]>(() => (
    initializeOptionSelection(availableIds, persistedId)
  ))
  const [selectionError, setSelectionError] = useState<string | null>(null)

  useEffect(() => {
    setOptionIds((current) => reconcileOptionSelection(
      current,
      availableIds,
      persistedId,
    ))
  }, [availableIds, persistedId])

  if (state.currentVehicle === null) {
    return <div className="empty-state page-empty"><h2>Cadastre o veículo atual</h2><p>O Ciladômetro precisa dessa referência para calcular o impacto da troca.</p></div>
  }
  if (state.candidates.length === 0) {
    return <div className="empty-state page-empty"><h2>Cadastre uma opção de troca</h2><p>Adicione ao menos um veículo para iniciar a análise final.</p></div>
  }

  let comparison: ReturnType<typeof calculateDecisionOptionsComparison> | null = null
  let error: string | null = null
  try {
    comparison = calculateDecisionOptionsComparison(state, optionIds)
  } catch (cause) {
    error = cause instanceof Error
      ? cause.message
      : 'Não foi possível calcular o Ciladômetro'
  }
  const columnsClass = comparison?.options.length === 1
    ? 'decision-comparison-grid decision-comparison-grid-single'
    : 'decision-comparison-grid'

  return (
    <div className="screen-stack decision-dashboard">
      <header className="page-header">
        <div>
          <span className="eyebrow">Decisão final</span>
          <h1>Ciladômetro</h1>
          <p>Compare o impacto financeiro real das opções em relação ao seu veículo atual.</p>
        </div>
        <OptionMultiSelect
          label="Veículos analisados"
          candidates={state.candidates}
          selectedIds={optionIds}
          error={selectionError}
          onError={setSelectionError}
          onChange={(next) => {
            if (next.length === 0) {
              setSelectionError('Selecione ao menos uma opção de troca.')
              return
            }
            setOptionIds(next)
          }}
        />
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {comparison && (
        <>
          <section>
            <div className="section-heading"><div><span className="eyebrow">Referência</span><h2>Comparação com {state.currentVehicle.vehicle.name}</h2></div></div>
            <div className={columnsClass}>
              {comparison.options.map((option) => <SummaryCard key={option.result.comparison.candidate.id} option={option} />)}
            </div>
          </section>

          <ComparisonHighlights comparison={comparison} />

          <section>
            <div className="section-heading"><div><span className="eyebrow">Custo de uso</span><h2>Economia operacional</h2></div></div>
            <div className={columnsClass}>
              {comparison.options.map((option) => <OperationalCard key={option.result.comparison.candidate.id} result={option.result} />)}
            </div>
          </section>

          <section>
            <div className="section-heading"><div><span className="eyebrow">Impacto financeiro</span><h2>Cenário recomendado</h2></div></div>
            <div className={columnsClass}>
              {comparison.options.map((option) => <MainScenarioCard key={option.result.comparison.candidate.id} option={option} />)}
            </div>
          </section>

          <section>
            <div className="section-heading"><div><span className="eyebrow">Movimento de caixa</span><h2>Primeiro período</h2></div></div>
            <div className={columnsClass}>
              {comparison.options.map((option) => <FirstPeriodCard key={option.result.comparison.candidate.id} option={option} />)}
            </div>
          </section>

          <section>
            <div className="section-heading"><div><span className="eyebrow">Horizonte da análise</span><h2>Fluxo real durante o financiamento</h2></div></div>
            <div className={columnsClass}>
              {comparison.options.map((option) => <RealFlowCard key={option.result.comparison.candidate.id} option={option} />)}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
