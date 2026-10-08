import {
  calculateCandidateFinancing,
  selectFinancingCandidate,
  setCandidateFinancing,
  type CandidateFinancingResult,
} from '../application/appState'
import { useAppState } from '../application/AppStateProvider'
import { FinancingForm } from './FinancingForm'
import { FinancingResults } from './FinancingResults'

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
    <div className="screen-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Compra, contrato e amortizações</span>
          <h1>Laboratório do financiamento</h1>
          <p>Configure o contrato, combine amortizações e analise o impacto no prazo, nos juros e no desembolso.</p>
        </div>
        <label className="field select-candidate">
          <span>Veículo a financiar</span>
          <select value={selectedId} onChange={(event) => updateState((current) => selectFinancingCandidate(current, event.target.value || null))}>
            <option value="">Selecione um veículo</option>
            {state.candidates.map((item) => <option key={item.id} value={item.id}>{item.vehicle.name}</option>)}
          </select>
        </label>
      </header>

      {!candidate && <div className="empty-state"><h2>Selecione o veículo a financiar</h2><p>Escolha o veículo que será usado nesta simulação.</p></div>}
      {candidate && (
        <>
          {!initialValue && <div className="alert alert-info">Financiamento ainda não configurado. Preencha as entradas abaixo para gerar os resultados.</div>}
          <FinancingForm
            candidateId={candidate.id}
            initialValue={initialValue}
            suggestedPrice={candidate.vehicle.vehicleValue}
            onSave={(financing) => updateState((current) => setCandidateFinancing(current, candidate.id, financing))}
          />
          {resultError && <div className="alert alert-error">{resultError}</div>}
          {result && <FinancingResults result={result} />}
        </>
      )}
    </div>
  )
}
