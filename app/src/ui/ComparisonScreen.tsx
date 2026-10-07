import {
  calculateSelectedVehicleComparison,
  selectComparisonCandidate,
  type IntegratedVehicleComparison,
} from '../application/appState'
import { useAppState } from '../application/AppStateProvider'
import type { TcoResult } from '../domain/tco'
import {
  formatCostPerKm,
  formatCurrency,
  formatPercentageValue,
} from './format'

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
  const candidateIsCheaper = monthly >= 0
  return (
    <section className={`insight-card ${candidateIsCheaper ? 'insight-positive' : 'insight-negative'}`}>
      <span className="eyebrow">Resultado operacional</span>
      <h2>
        {candidateIsCheaper
          ? `Candidato ${formatCurrency(Math.abs(monthly))} mais barato por mês`
          : `Candidato ${formatCurrency(Math.abs(monthly))} mais caro por mês`}
      </h2>
      <div className="insight-metrics">
        <div><span>{candidateIsCheaper ? 'Economia anual' : 'Custo adicional anual'}</span><strong>{formatCurrency(Math.abs(result.operationalSavings.annual))}</strong></div>
        <div><span>{candidateIsCheaper ? 'Economia mensal' : 'Custo adicional mensal'}</span><strong>{formatCurrency(Math.abs(monthly))}</strong></div>
        <div><span>Diferença por km</span><strong>{formatCostPerKm(Math.abs(result.operationalSavings.perKm))}</strong></div>
        <div><span>Diferença percentual de caixa</span><strong>{formatPercentageValue(result.cashDifference.percentage.annual)}</strong></div>
      </div>
      <p>A direção do cálculo é veículo atual menos candidato. Valores positivos indicam economia com o candidato.</p>
    </section>
  )
}

export function ComparisonScreen() {
  const { state, updateState } = useAppState()
  const selected = state.selectedComparisonCandidateId ?? ''

  if (state.currentVehicle === null) {
    return <div className="empty-state page-empty"><h2>Cadastre o veículo atual</h2><p>O veículo atual é a referência necessária para calcular as diferenças de TCO.</p></div>
  }
  if (state.candidates.length === 0) {
    return <div className="empty-state page-empty"><h2>Adicione um candidato</h2><p>Cadastre ao menos um veículo candidato para iniciar a comparação.</p></div>
  }

  let result: IntegratedVehicleComparison | null = null
  let error: string | null = null
  if (selected) {
    try {
      result = calculateSelectedVehicleComparison(state)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Não foi possível comparar os veículos'
    }
  }

  return (
    <div className="screen-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Decisão orientada por custos</span>
          <h1>Comparação</h1>
          <p>Compare o TCO anual normalizado do veículo atual com um candidato.</p>
        </div>
        <label className="field select-candidate">
          <span>Candidato</span>
          <select value={selected} onChange={(event) => updateState((current) => selectComparisonCandidate(current, event.target.value || null))}>
            <option value="">Selecione um candidato</option>
            {state.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.vehicle.name}</option>)}
          </select>
        </label>
      </header>

      {!selected && <div className="empty-state"><h2>Selecione um candidato</h2><p>Escolha um veículo acima para visualizar o comparativo completo.</p></div>}
      {error && <div className="alert alert-error">{error}</div>}
      {result && (
        <>
          <ComparisonSummary result={result} />
          <div className="comparison-grid">
            <TcoPanel label="Veículo atual" name={result.current.vehicle.name} tco={result.currentTco} emphasized={result.currentTco.cashTco.monthly <= result.candidateTco.cashTco.monthly} />
            <TcoPanel label="Candidato" name={result.candidate.vehicle.name} tco={result.candidateTco} emphasized={result.candidateTco.cashTco.monthly < result.currentTco.cashTco.monthly} />
          </div>
          <section className="data-card">
            <h2>Diferenças</h2>
            <div className="insight-metrics">
              <div><span>Diferença absoluta de caixa</span><strong>{formatCurrency(result.cashDifference.absolute.annual)}/ano</strong></div>
              <div><span>Diferença percentual de caixa</span><strong>{formatPercentageValue(result.cashDifference.percentage.annual)}</strong></div>
              <div><span>Diferença econômica absoluta</span><strong>{formatCurrency(result.economicDifference.absolute.annual)}/ano</strong></div>
              <div><span>Diferença econômica percentual</span><strong>{formatPercentageValue(result.economicDifference.percentage.annual)}</strong></div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
