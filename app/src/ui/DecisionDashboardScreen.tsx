import { useEffect, useMemo, useState } from 'react'
import {
  calculateDecisionOptionsComparison,
  type ComparedDecisionOption,
  type DecisionDashboardResult,
} from '../application/decisionDashboard'
import { useAppState } from '../application/AppStateProvider'
import {
  initializeOptionSelection,
  MAX_DASHBOARD_OPTIONS,
  reconcileOptionSelection,
} from '../application/multiVehicleSelection'
import type { ExtraPaymentStrategy } from '../domain/financing'
import { strategyLabels } from './FinancingForm'
import {
  formatCostPerKm,
  formatCurrency,
  formatSignedMonthlyCurrency,
} from './format'
import { OptionMultiSelect } from './OptionMultiSelect'
import { OutcomeBadge } from './OutcomeBadge'
import { findUniqueLowestMetricId } from '../application/resultHighlights'
import { Activity, CirclePlus, PiggyBank, Receipt, Scale, Sigma, Target, Wallet } from 'lucide-react'
import { AppIcon } from './AppIcon'
import { SectionHeader } from './SectionHeader'

function cashImpactMeaning(value: number): string {
  if (value > 0) return 'Custo adicional'
  if (value < 0) return 'Economia líquida'
  return 'Impacto neutro'
}

function CashImpactValue({ value, monthly = true, showMeaning = true }: {
  readonly value: number
  readonly monthly?: boolean
  readonly showMeaning?: boolean
}) {
  const formatted = monthly
    ? formatSignedMonthlyCurrency(value)
    : value > 0
      ? `+ ${formatCurrency(value)}`
      : value < 0
        ? `- ${formatCurrency(Math.abs(value))}`
        : formatCurrency(0)
  return (
    <span className={`cash-impact-value ${value < 0 ? 'cash-impact-saving' : value > 0 ? 'cash-impact-cost' : ''}`}>
      <strong>{formatted}</strong>
      {showMeaning && <small>{cashImpactMeaning(value)}</small>}
    </span>
  )
}

function StrategyRecommendation({ strategies }: {
  readonly strategies: readonly ExtraPaymentStrategy[]
}) {
  if (strategies.length === 1) {
    return <div className="decision-recommendation"><span><AppIcon icon={Target} />Estratégia de amortização</span><strong>{strategyLabels[strategies[0]]}</strong></div>
  }
  return (
    <div className="decision-recommendation">
      <span><AppIcon icon={Target} />Estratégia de amortização</span>
      <strong>Empate técnico entre {strategies.length} estratégias</strong>
      <details className="decision-tied-strategies">
        <summary>Ver estratégias empatadas</summary>
        <ul>{strategies.map((strategy) => <li key={strategy}>{strategyLabels[strategy]}</li>)}</ul>
      </details>
    </div>
  )
}

function MissingFinancing() {
  return (
    <div className="decision-missing-financing">
      <strong>Financiamento não configurado</strong>
      <span>Configure o financiamento deste veículo para calcular o impacto no bolso.</span>
    </div>
  )
}

function OperationalCard({ result, winner }: {
  readonly result: DecisionDashboardResult
  readonly winner: boolean
}) {
  const optionName = result.comparison.candidate.vehicle.name
  const currentName = result.comparison.current.vehicle.name
  const isSaving = result.operationalSavingsMonthly >= 0
  return (
    <article className={`decision-topic-option ${winner ? 'outcome-card-winner' : ''}`}>
      {winner && <OutcomeBadge>Menor custo de uso</OutcomeBadge>}
      <div className="decision-topic-option-heading"><span>Opção de troca</span><h3>{optionName}</h3></div>
      <div className={`decision-operational-callout ${isSaving ? 'is-saving' : 'is-cost'}`}>
        <span>{isSaving ? 'Economia mensal' : 'Custo adicional mensal'}</span>
        <strong>{formatCurrency(Math.abs(result.operationalSavingsMonthly))}</strong>
        <small>em relação ao {currentName}</small>
        <p className="after-payoff-context">Após a quitação, sem parcelas do financiamento.</p>
      </div>
      <dl className="decision-compact-metrics">
        <div><dt>Custo de uso mensal</dt><dd>{formatCurrency(result.optionMonthlyCashTco)}</dd></div>
        <div><dt>{isSaving ? 'Economia anual' : 'Custo anual adicional'}</dt><dd>{formatCurrency(Math.abs(result.operationalSavingsAnnual))}</dd></div>
        <div><dt>Diferença por km</dt><dd>{formatCostPerKm(Math.abs(result.operationalSavingsPerKm))}</dd></div>
        <div><dt>TCO da referência</dt><dd>{formatCurrency(result.currentMonthlyCashTco)}/mês</dd></div>
      </dl>
    </article>
  )
}

function SummaryCard({ option, winner }: {
  readonly option: ComparedDecisionOption
  readonly winner: boolean
}) {
  const result = option.result
  const recommendation = result.recommendedStrategies
  const metrics = result.recommendedStrategy
  const horizon = option.commonHorizonCashImpact
  return (
    <article className={`decision-hero-option decision-result-card decision-consolidated-card ${winner ? 'financial-winner' : ''}`}>
      {winner && <OutcomeBadge tone="decision">Menor impacto total no bolso</OutcomeBadge>}
      <div className="decision-hero-option-heading"><div><span>Opção analisada</span><h3>{result.comparison.candidate.vehicle.name}</h3></div></div>
      {recommendation === null || metrics === null || horizon === null ? <MissingFinancing /> : (
        <>
          <StrategyRecommendation strategies={recommendation} />
          <div className="decision-primary-impact">
            <span><AppIcon icon={Wallet} />Impacto líquido real no 1º mês</span>
            <CashImpactValue value={metrics.firstPeriodNetDisbursementImpact} />
          </div>
          <div className="decision-card-group">
            <h4>Composição do primeiro mês</h4>
            <dl className="decision-consolidated-metrics">
              <div><dt><AppIcon icon={Receipt} size={16} />Parcela contratual</dt><dd>{formatCurrency(metrics.firstPeriodContractualPayment)}</dd></div>
              <div><dt><AppIcon icon={CirclePlus} size={16} />Aporte aplicado</dt><dd>{formatCurrency(metrics.firstPeriodExtraPayment)}</dd></div>
              <div><dt><AppIcon icon={Receipt} size={16} />Cobranças</dt><dd>{formatCurrency(metrics.firstPeriodPeriodicCharges)}</dd></div>
              <div><dt><AppIcon icon={PiggyBank} size={16} />{result.operationalSavingsMonthly >= 0 ? 'Economia operacional' : 'Custo operacional adicional'}</dt><dd>{formatCurrency(Math.abs(result.operationalSavingsMonthly))}</dd></div>
              <div className="decision-payment-total"><dt>Pagamento financeiro</dt><dd>{formatCurrency(metrics.firstPeriodTotalPayment)}</dd></div>
            </dl>
          </div>
          <div className="decision-card-group">
            <h4>No horizonte de {horizon.horizonMonths} meses</h4>
            <div className="horizon-indicator-grid">
              <div><span><AppIcon icon={Activity} size={16} />Impacto médio mensal</span><CashImpactValue value={horizon.averageImpact} showMeaning={false} /></div>
              <div><span>Maior impacto</span><CashImpactValue value={horizon.maximumImpact} showMeaning={false} /></div>
              <div><span>Menor impacto</span><CashImpactValue value={horizon.minimumImpact} showMeaning={false} /></div>
              <div className="horizon-total"><span><AppIcon icon={Sigma} size={16} />Impacto acumulado</span><CashImpactValue value={horizon.cumulativeImpact} monthly={false} showMeaning={false} /></div>
            </div>
          </div>
          <dl className="decision-financing-strip">
            <div><dt>Prazo original</dt><dd>{metrics.scenario.originalTermMonths} meses</dd></div>
            <div><dt>Prazo efetivo</dt><dd>{metrics.scenario.effectiveTermMonths} meses</dd></div>
            <div><dt>Total desembolsado</dt><dd>{formatCurrency(metrics.scenario.totalDisbursed)}</dd></div>
            <div><dt>Juros totais</dt><dd>{formatCurrency(metrics.scenario.totalInterest)}</dd></div>
          </dl>
        </>
      )}
    </article>
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
      MAX_DASHBOARD_OPTIONS,
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
    ? 'decision-option-grid decision-option-grid-single'
    : 'decision-option-grid'
  const lowestOperationalId = comparison ? findUniqueLowestMetricId([
    { id: state.currentVehicle.id, value: comparison.options[0]?.result.currentMonthlyCashTco ?? NaN },
    ...comparison.options.map((option) => ({ id: option.result.comparison.candidate.id, value: option.result.optionMonthlyCashTco })),
  ]) : null
  const totalWinnerId = comparison && comparison.options.length >= 2 && comparison.lowestTotalImpactOptionIds?.length === 1
    ? comparison.lowestTotalImpactOptionIds[0] : null

  return (
    <div className="screen-stack decision-dashboard decision-dashboard-v2">
      <header className="page-header decision-dashboard-header">
        <div>
          <span className="eyebrow">Decisão final</span>
          <h1>Ciladômetro</h1>
          <p>Financiamento agora. Custo de uso após a quitação.</p>
        </div>
        <OptionMultiSelect
          label="Opções para analisar"
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
          <section className="decision-command-center">
            <div className="decision-command-heading">
              <p>Comparação com <strong className="reference-text">{state.currentVehicle.vehicle.name}</strong></p>
              {comparison.comparisonHorizonMonths && <span className="decision-horizon-badge">Horizonte comum · {comparison.comparisonHorizonMonths} meses</span>}
            </div>
            <SectionHeader icon={Scale} title="Decisão financeira" level="h2" />
            <details className="decision-criterion"><summary>Como ler esta análise</summary><p>O impacto reúne pagamentos financeiros menos economia operacional. Entrada não financiada, valor residual e revenda não entram automaticamente neste indicador.</p></details>
            <div className={columnsClass}>
              {comparison.options.map((option) => <SummaryCard key={option.result.comparison.candidate.id} option={option} winner={totalWinnerId === option.result.comparison.candidate.id} />)}
            </div>
          </section>

          <section className="decision-topic-board">
            <SectionHeader icon={PiggyBank} title="Quanto custa manter cada carro" level="h2" />
            <div className={columnsClass}>
              {comparison.options.map((option) => <OperationalCard key={option.result.comparison.candidate.id} result={option.result} winner={lowestOperationalId === option.result.comparison.candidate.id} />)}
            </div>
          </section>

        </>
      )}
    </div>
  )
}
