import { useEffect, useMemo, useState } from 'react'
import {
  selectComparisonCandidate,
  type IntegratedVehicleComparison,
} from '../application/appState'
import { useAppState } from '../application/AppStateProvider'
import {
  calculateOptionComparisons,
  initializeOptionSelection,
  MAX_DASHBOARD_OPTIONS,
  reconcileOptionSelection,
} from '../application/multiVehicleSelection'
import type { TcoResult } from '../domain/tco'
import type { Vehicle } from '../domain/vehicle'
import { findUniqueLowestMetricId } from '../application/resultHighlights'
import {
  formatCostPerKm,
  formatCurrency,
  formatOperationalHeadline,
  formatPercentageValue,
} from './format'
import { OptionMultiSelect } from './OptionMultiSelect'
import { TcoBreakdownTable } from './TcoBreakdownTable'
import { OutcomeBadge } from './OutcomeBadge'
import { ArrowDownRight, ArrowUpRight, Calendar, CalendarDays, Receipt, Route } from 'lucide-react'
import { AppIcon } from './AppIcon'
import { PowertrainBadge } from './PowertrainBadge'

function ComparisonVehicleCard({
  label,
  vehicle,
  tco,
  monthlyDifference,
  reference = false,
  winner = false,
}: {
  readonly label: string
  readonly vehicle: Vehicle
  readonly tco: TcoResult
  readonly monthlyDifference?: number
  readonly reference?: boolean
  readonly winner?: boolean
}) {
  const saving = monthlyDifference !== undefined && monthlyDifference >= 0
  return (
    <article className={`comparison-vehicle-card ${reference ? 'comparison-vehicle-reference' : ''} ${winner ? 'outcome-card-winner' : ''}`}>
      {reference && <OutcomeBadge tone="reference">Referência</OutcomeBadge>}
      {winner && <OutcomeBadge>Menor TCO de caixa</OutcomeBadge>}
      <div className="comparison-vehicle-heading">
        <div>
          <span className="eyebrow">{label}</span>
          <h2>{vehicle.name}</h2>
        </div>
        <PowertrainBadge powertrain={vehicle.powertrain} reference={reference} />
      </div>
      <div className="comparison-primary-cost">
        <span><AppIcon icon={CalendarDays} size={20} />TCO de caixa mensal</span>
        <strong>{formatCurrency(tco.cashTco.monthly)}</strong>
        {monthlyDifference !== undefined && (
        <small className={`vehicle-cost-difference ${monthlyDifference === 0 ? 'vehicle-cost-neutral' : saving ? 'vehicle-cost-saving' : 'vehicle-cost-extra'}`}>
          {monthlyDifference === 0 ? 'Mesmo custo operacional' : <>
            <AppIcon icon={saving ? ArrowUpRight : ArrowDownRight} size={16} />{saving ? 'Economia' : 'Custo adicional'} de {formatCurrency(Math.abs(monthlyDifference))}/mês
          </>}
          </small>
        )}
      </div>
      <dl className="comparison-cost-strip">
        <div><dt><AppIcon icon={Calendar} size={20} />Anual</dt><dd>{formatCurrency(tco.cashTco.annual)}</dd></div>
        <div><dt><AppIcon icon={Route} size={20} />Por km</dt><dd>{formatCostPerKm(tco.cashTco.perKm)}</dd></div>
        <div><dt><AppIcon icon={Receipt} size={20} />TCO econômico</dt><dd>{formatCurrency(tco.economicTco.monthly)}/mês</dd></div>
      </dl>
    </article>
  )
}
function OperationalInsight({ result, winner }: {
  readonly result: IntegratedVehicleComparison
  readonly winner: boolean
}) {
  const monthly = result.operationalSavings.monthly
  const optionIsCheaper = monthly >= 0
  return (
    <article className={`comparison-insight ${optionIsCheaper ? 'comparison-insight-saving' : 'comparison-insight-cost'} ${winner ? 'outcome-card-winner' : ''}`}>
      {winner && <OutcomeBadge>Maior economia operacional</OutcomeBadge>}
      <div>
        <h3>{formatOperationalHeadline(result.candidate.vehicle.name, monthly)}</h3>
      </div>
      <dl className="comparison-insight-metrics">
        <div><dt>{optionIsCheaper ? 'Economia anual' : 'Custo anual adicional'}</dt><dd>{formatCurrency(Math.abs(result.operationalSavings.annual))}</dd></div>
        <div><dt>Diferença por km</dt><dd>{formatCostPerKm(Math.abs(result.operationalSavings.perKm))}</dd></div>
        <div><dt>Diferença de caixa</dt><dd>{formatPercentageValue(result.cashDifference.percentage.annual)}</dd></div>
        <div><dt>Diferença econômica</dt><dd>{formatPercentageValue(result.economicDifference.percentage.annual)}</dd></div>
      </dl>
    </article>
  )
}

export function ComparisonScreen() {
  const { state, updateState } = useAppState()
  const availableIds = useMemo(
    () => state.candidates.map((candidate) => candidate.id),
    [state.candidates],
  )
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(() => (
    initializeOptionSelection(availableIds, state.selectedComparisonCandidateId)
  ))
  const [selectionError, setSelectionError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedIds((current) => reconcileOptionSelection(
      current,
      availableIds,
      state.selectedComparisonCandidateId,
      MAX_DASHBOARD_OPTIONS,
    ))
  }, [availableIds, state.selectedComparisonCandidateId])

  if (state.currentVehicle === null) {
    return <div className="empty-state page-empty"><h2>Cadastre o veículo atual</h2><p>O veículo atual é a referência necessária para calcular as diferenças de TCO.</p></div>
  }
  if (state.candidates.length === 0) {
    return <div className="empty-state page-empty"><h2>Adicione uma opção de troca</h2><p>Cadastre ao menos uma opção de troca para iniciar a comparação.</p></div>
  }

  let results: readonly IntegratedVehicleComparison[] = []
  let calculationError: string | null = null
  try {
    results = calculateOptionComparisons(state, selectedIds)
  } catch (cause) {
    calculationError = cause instanceof Error
      ? cause.message
      : 'Não foi possível comparar os veículos'
  }
  const currentResult = results[0]
  const lowestCostId = currentResult ? findUniqueLowestMetricId([
    { id: currentResult.current.id, value: currentResult.currentTco.cashTco.monthly },
    ...results.map((result) => ({ id: result.candidate.id, value: result.candidateTco.cashTco.monthly })),
  ]) : null

  return (
    <div className="screen-stack comparison-screen comparison-dashboard">
      <header className="page-header comparison-dashboard-header">
        <div>
          <span className="eyebrow">Qual custa menos?</span>
          <h1>Comparação</h1>
          <p>Compare os custos das opções com os do seu veículo atual.</p>
        </div>
        <OptionMultiSelect
          label="Opções para comparar"
          candidates={state.candidates}
          selectedIds={selectedIds}
          error={selectionError}
          onError={setSelectionError}
          onChange={(next) => {
            if (next.length === 0) {
              setSelectionError('Selecione ao menos uma opção de troca.')
              return
            }
            setSelectedIds(next)
            updateState((current) => selectComparisonCandidate(current, next[0]))
          }}
        />
      </header>

      {calculationError && <div className="alert alert-error">{calculationError}</div>}
      {currentResult && (
        <>
          <section className="comparison-hero-board">
            <div className="dashboard-section-heading">
              <div><span className="eyebrow">Visão lado a lado</span><h2>Custos de uso</h2></div>
              <span className="comparison-reference-context">Referência: <strong>{currentResult.current.vehicle.name}</strong></span>
            </div>
            <div className={`comparison-vehicle-grid comparison-vehicle-grid-${results.length + 1}`}>
              <ComparisonVehicleCard
                label="Veículo atual · referência"
                vehicle={currentResult.current.vehicle}
                tco={currentResult.currentTco}
                reference
              />
              {results.map((result) => (
                <ComparisonVehicleCard
                  key={result.candidate.id}
                  label="Opção de troca"
                  vehicle={result.candidate.vehicle}
                  tco={result.candidateTco}
                  monthlyDifference={result.operationalSavings.monthly}
                  winner={lowestCostId === result.candidate.id}
                />
              ))}
            </div>
          </section>

          <section className="comparison-insights-board">
            <div className="dashboard-section-heading">
              <div><span className="eyebrow">Leitura rápida</span><h2>Resultado operacional</h2></div>
            </div>
            <div className={`comparison-insights-grid comparison-insights-grid-${results.length}`}>
              {results.map((result) => (
                <OperationalInsight key={result.candidate.id} result={result} winner={lowestCostId === result.candidate.id} />
              ))}
            </div>
          </section>

          <TcoBreakdownTable
            current={state.currentVehicle.vehicle}
            options={results.map((result) => result.candidate.vehicle)}
          />

        </>
      )}
    </div>
  )
}
