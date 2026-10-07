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
    return <div className="empty-state page-empty"><h2>Cadastre um candidato</h2><p>O financiamento precisa estar associado a um veículo candidato.</p></div>
  }

  return (
    <div className="screen-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Compra e contrato PRICE</span>
          <h1>Financiamento</h1>
          <p>Configure o contrato, aportes e cobranças. Os resultados são recalculados a partir das entradas salvas.</p>
        </div>
        <label className="field select-candidate">
          <span>Candidato financiado</span>
          <select value={selectedId} onChange={(event) => updateState((current) => selectFinancingCandidate(current, event.target.value || null))}>
            <option value="">Selecione um candidato</option>
            {state.candidates.map((item) => <option key={item.id} value={item.id}>{item.vehicle.name}</option>)}
          </select>
        </label>
      </header>

      {!candidate && <div className="empty-state"><h2>Selecione um candidato</h2><p>Escolha o veículo que será usado nesta simulação.</p></div>}
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
