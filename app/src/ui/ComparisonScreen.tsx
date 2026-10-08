import { useEffect, useMemo, useState } from 'react'
import {
  selectComparisonCandidate,
  type IntegratedVehicleComparison,
} from '../application/appState'
import { useAppState } from '../application/AppStateProvider'
import {
  calculateOptionComparisons,
  initializeOptionSelection,
  reconcileOptionSelection,
} from '../application/multiVehicleSelection'
import type { TcoResult } from '../domain/tco'
import {
  formatCostPerKm,
  formatCurrency,
  formatOperationalHeadline,
  formatPercentageValue,
} from './format'
import { OptionMultiSelect } from './OptionMultiSelect'
import { TcoBreakdownTable } from './TcoBreakdownTable'

interface TcoPanelProps {
  readonly label: string
  readonly name: string
  readonly tco: TcoResult
  readonly emphasized: boolean
}

function TcoPanel({ label, name, tco, emphasized }: TcoPanelProps) {
  return (
    <article className={`comparison-card ${emphasized ? 'comparison-card-best' : ''}`}>
      <span className="eyebrow">{label}</span>
      <h2>{name}</h2>
      <div className="metric-group">
        <h3>TCO de caixa</h3>
        <dl className="metric-list">
          <div><dt>Anual</dt><dd>{formatCurrency(tco.cashTco.annual)}</dd></div>
          <div><dt>Mensal</dt><dd>{formatCurrency(tco.cashTco.monthly)}</dd></div>
          <div><dt>Por km</dt><dd>{formatCostPerKm(tco.cashTco.perKm)}</dd></div>
        </dl>
      </div>
      <div className="metric-group">
        <h3>TCO econômico</h3>
        <dl className="metric-list">
          <div><dt>Anual</dt><dd>{formatCurrency(tco.economicTco.annual)}</dd></div>
          <div><dt>Mensal</dt><dd>{formatCurrency(tco.economicTco.monthly)}</dd></div>
          <div><dt>Por km</dt><dd>{formatCostPerKm(tco.economicTco.perKm)}</dd></div>
        </dl>
      </div>
    </article>
  )
}

function ComparisonSummary({ result }: { readonly result: IntegratedVehicleComparison }) {
  const monthly = result.operationalSavings.monthly
  const optionIsCheaper = monthly >= 0
  return (
    <section className={`insight-card ${optionIsCheaper ? 'insight-positive' : 'insight-negative'}`}>
      <span className="eyebrow">Resultado operacional</span>
      <h2>{formatOperationalHeadline(result.candidate.vehicle.name, monthly)}</h2>
      <div className="insight-metrics">
        <div><span>{optionIsCheaper ? 'Economia anual' : 'Custo adicional anual'}</span><strong>{formatCurrency(Math.abs(result.operationalSavings.annual))}</strong></div>
        <div><span>{optionIsCheaper ? 'Economia mensal' : 'Custo adicional mensal'}</span><strong>{formatCurrency(Math.abs(monthly))}</strong></div>
        <div><span>Diferença por km</span><strong>{formatCostPerKm(Math.abs(result.operationalSavings.perKm))}</strong></div>
        <div><span>Diferença percentual de caixa</span><strong>{formatPercentageValue(result.cashDifference.percentage.annual)}</strong></div>
      </div>
    </section>
  )
}

function ConsolidatedDifferences({ result }: {
  readonly result: IntegratedVehicleComparison
}) {
  return (
    <article className="data-card">
      <h3>{result.candidate.vehicle.name}</h3>
      <div className="insight-metrics">
        <div><span>Diferença absoluta de caixa</span><strong>{formatCurrency(result.cashDifference.absolute.annual)}/ano</strong></div>
        <div><span>Diferença percentual de caixa</span><strong>{formatPercentageValue(result.cashDifference.percentage.annual)}</strong></div>
        <div><span>Diferença econômica absoluta</span><strong>{formatCurrency(result.economicDifference.absolute.annual)}/ano</strong></div>
        <div><span>Diferença econômica percentual</span><strong>{formatPercentageValue(result.economicDifference.percentage.annual)}</strong></div>
      </div>
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

  return (
    <div className="screen-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Decisão orientada por custos</span>
          <h1>Comparação</h1>
          <p>Compare uma ou duas opções com o TCO anual normalizado do veículo atual.</p>
        </div>
        <OptionMultiSelect
          label="Veículos comparados"
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
      {results.length > 0 && (
        <>
          <div className={`multi-result-grid ${results.length === 1 ? 'multi-result-grid-single' : ''}`}>
            {results.map((result) => (
              <ComparisonSummary key={result.candidate.id} result={result} />
            ))}
          </div>
          {currentResult && (
            <div className={`comparison-grid ${results.length === 2 ? 'comparison-grid-three' : ''}`}>
              <TcoPanel
                label="Veículo atual"
                name={currentResult.current.vehicle.name}
                tco={currentResult.currentTco}
                emphasized={results.every((result) => (
                  currentResult.currentTco.cashTco.monthly <= result.candidateTco.cashTco.monthly
                ))}
              />
              {results.map((result) => (
                <TcoPanel
                  key={result.candidate.id}
                  label="Opção de troca"
                  name={result.candidate.vehicle.name}
                  tco={result.candidateTco}
                  emphasized={result.candidateTco.cashTco.monthly < result.currentTco.cashTco.monthly}
                />
              ))}
            </div>
          )}
          <TcoBreakdownTable
            current={state.currentVehicle.vehicle}
            options={results.map((result) => result.candidate.vehicle)}
          />
          <section>
            <div className="section-heading"><div><span className="eyebrow">Visão consolidada</span><h2>Diferenças</h2></div></div>
            <div className={`multi-result-grid ${results.length === 1 ? 'multi-result-grid-single' : ''}`}>
              {results.map((result) => (
                <ConsolidatedDifferences key={result.candidate.id} result={result} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
