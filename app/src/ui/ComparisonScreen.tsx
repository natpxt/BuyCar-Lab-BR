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
  formatOperationalHeadline,
  formatPercentageValue,
} from './format'
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
      <p>A direção do cálculo é veículo atual menos opção de troca. Valores positivos indicam economia com {result.candidate.vehicle.name}.</p>
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
    return <div className="empty-state page-empty"><h2>Adicione uma opção de troca</h2><p>Cadastre ao menos uma opção de troca para iniciar a comparação.</p></div>
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
          <p>Compare o TCO anual normalizado do veículo atual com uma opção de troca.</p>
        </div>
        <label className="field select-candidate">
          <span>Veículo comparado</span>
          <select value={selected} onChange={(event) => updateState((current) => selectComparisonCandidate(current, event.target.value || null))}>
            <option value="">Selecione um veículo</option>
            {state.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.vehicle.name}</option>)}
          </select>
        </label>
      </header>

      {!selected && <div className="empty-state"><h2>Selecione um veículo comparado</h2><p>Escolha um veículo acima para visualizar o comparativo completo.</p></div>}
      {error && <div className="alert alert-error">{error}</div>}
      {result && (
        <>
          <ComparisonSummary result={result} />
          <div className="comparison-grid">
            <TcoPanel label="Veículo atual" name={result.current.vehicle.name} tco={result.currentTco} emphasized={result.currentTco.cashTco.monthly <= result.candidateTco.cashTco.monthly} />
            <TcoPanel label="Opção de troca" name={result.candidate.vehicle.name} tco={result.candidateTco} emphasized={result.candidateTco.cashTco.monthly < result.currentTco.cashTco.monthly} />
          </div>
          <TcoBreakdownTable
            current={result.current.vehicle}
            option={result.candidate.vehicle}
          />
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
