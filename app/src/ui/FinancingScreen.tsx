import {
  calculateCandidateFinancing,
  selectFinancingCandidate,
  setCandidateFinancing,
  type CandidateFinancingResult,
} from '../application/appState'
import { useAppState } from '../application/AppStateProvider'
import { formatCurrency } from './format'
import { FinancingForm } from './FinancingForm'
import { OptionMultiSelect } from './OptionMultiSelect'
import {
  FinancingLiveSummary,
  FinancingResults,
} from './FinancingResults'

export function FinancingScreen() {
  const { state, updateState } = useAppState()
  const selectedId = state.selectedFinancingCandidateId ?? ''
  const candidate = state.candidates.find((item) => item.id === selectedId)
  const initialValue = selectedId
    ? state.financingByCandidateId[selectedId]
    : undefined
  let result: CandidateFinancingResult | null = null
  let resultError: string | null = null

  if (candidate && initialValue) {
    try {
      result = calculateCandidateFinancing(state, candidate.id)
    } catch (cause) {
      resultError = cause instanceof Error
        ? cause.message
        : 'Não foi possível calcular o financiamento'
    }
  }

  if (state.candidates.length === 0) {
    return <div className="empty-state page-empty"><h2>Cadastre uma opção de troca</h2><p>O financiamento precisa estar associado ao veículo que você pretende comprar.</p></div>
  }

  return (
    <div className="screen-stack financing-screen financing-dashboard">
      <header className="page-header financing-dashboard-header">
        <div>
          <span className="eyebrow">Compra, contrato e amortizações</span>
          <h1>Simular financiamento</h1>
        </div>
        <OptionMultiSelect
          label="Veículo a financiar"
          candidates={state.candidates}
          selectedIds={selectedId ? [selectedId] : []}
          maximumOptions={1}
          error={null}
          onError={() => {}}
          onChange={(next) => updateState((current) => selectFinancingCandidate(current, next[0] ?? null))}
        />
      </header>

      {!candidate && <div className="empty-state"><h2>Selecione o veículo a financiar</h2><p>Escolha o veículo que será usado nesta simulação.</p></div>}
      {candidate && (
        <>
          <section className="financing-config-zone">
            <div className="financing-config-column">
              <div className="dashboard-section-heading">
                <div><h2>Monte seu contrato</h2></div>
              </div>
              {!initialValue && <div className="alert alert-info">Financiamento ainda não configurado. Preencha as entradas abaixo para gerar os resultados.</div>}
              <FinancingForm
                candidateId={candidate.id}
                initialValue={initialValue}
                suggestedPrice={candidate.vehicle.vehicleValue}
                onSave={(financing) => updateState((current) => setCandidateFinancing(current, candidate.id, financing))}
              />
            </div>

            <aside className="financing-live-column">
              <div className="dashboard-section-heading">
                <div><h2>Resumo da simulação</h2></div>
              </div>
              {result ? (
                <FinancingLiveSummary result={result} financing={initialValue} />
              ) : (
                <div className="financing-live-empty">
                  <span className="tag">Aguardando cálculo</span>
                  <h3>{candidate.vehicle.name}</h3>
                  <strong>{formatCurrency(candidate.vehicle.vehicleValue)}</strong>
                  <p>Salve a configuração para preencher prestação, prazo, estratégia e valor financiado.</p>
                </div>
              )}
            </aside>
          </section>

          {resultError && <div className="alert alert-error">{resultError}</div>}
          {result && <FinancingResults result={result} />}
        </>
      )}
    </div>
  )
}
