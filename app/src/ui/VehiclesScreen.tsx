import { useState } from 'react'
import {
  addCandidate,
  deleteCandidate,
  duplicateCandidate,
  editCandidate,
  setCurrentVehicle,
  type StoredVehicle,
} from '../application/appState'
import { useAppState } from '../application/AppStateProvider'
import type { Vehicle } from '../domain/vehicle'
import { formatCurrency, formatNumber } from './format'
import { VehicleForm } from './VehicleForm'

type EditorTarget =
  | { readonly kind: 'current'; readonly record?: StoredVehicle }
  | { readonly kind: 'candidate'; readonly record?: StoredVehicle }

const powertrainLabel = {
  ICE: 'Combustão',
  HEV: 'Híbrido',
  PHEV: 'Híbrido plug-in',
  BEV: 'Elétrico',
}

function newId(): string {
  return crypto.randomUUID()
}

export function VehiclesScreen() {
  const { state, updateState } = useAppState()
  const [editor, setEditor] = useState<EditorTarget | null>(null)

  const saveVehicle = (vehicle: Vehicle) => {
    if (editor?.kind === 'current') {
      updateState((current) => setCurrentVehicle(
        current,
        vehicle,
        editor.record?.id ?? newId(),
      ))
    } else if (editor?.kind === 'candidate') {
      updateState((current) => editor.record
        ? editCandidate(current, editor.record.id, vehicle)
        : addCandidate(current, vehicle, newId()))
    }
    setEditor(null)
  }

  if (editor) {
    const current = editor.kind === 'current'
    return (
      <VehicleForm
        initialVehicle={editor.record?.vehicle}
        title={editor.record
          ? `Editar ${current ? 'veículo atual' : 'candidato'}`
          : `Cadastrar ${current ? 'veículo atual' : 'candidato'}`}
        submitLabel="Salvar veículo"
        onCancel={() => setEditor(null)}
        onSubmit={saveVehicle}
      />
    )
  }

  return (
    <div className="screen-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Garagem do estudo</span>
          <h1>Veículos</h1>
          <p>Cadastre os dados usados nos cálculos de TCO e financiamento.</p>
        </div>
        <button className="button button-primary" onClick={() => setEditor({ kind: 'candidate' })}>
          Adicionar candidato
        </button>
      </header>

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Referência</span>
            <h2>Veículo atual</h2>
          </div>
        </div>
        {state.currentVehicle ? (
          <article className="vehicle-card vehicle-card-current">
            <div>
              <span className="tag">{powertrainLabel[state.currentVehicle.vehicle.powertrain]}</span>
              <h3>{state.currentVehicle.vehicle.name}</h3>
              <p>{formatNumber(state.currentVehicle.vehicle.annualMileageKm)} km/ano · {formatCurrency(state.currentVehicle.vehicle.vehicleValue)}</p>
            </div>
            <button className="button button-secondary" onClick={() => setEditor({ kind: 'current', record: state.currentVehicle ?? undefined })}>
              Editar veículo atual
            </button>
          </article>
        ) : (
          <div className="empty-state">
            <h3>Nenhum veículo atual cadastrado</h3>
            <p>Cadastre seu veículo atual para iniciar a comparação.</p>
            <button className="button button-primary" onClick={() => setEditor({ kind: 'current' })}>
              Cadastrar veículo atual
            </button>
          </div>
        )}
      </section>

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Alternativas</span>
            <h2>Candidatos</h2>
          </div>
          <span className="count-badge">{state.candidates.length}</span>
        </div>
        {state.candidates.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhum candidato cadastrado</h3>
            <p>Adicione um veículo para comparar custos e simular a compra.</p>
          </div>
        ) : (
          <div className="card-grid">
            {state.candidates.map((candidate) => (
              <article className="vehicle-card" key={candidate.id}>
                <div>
                  <span className="tag">{powertrainLabel[candidate.vehicle.powertrain]}</span>
                  <h3>{candidate.vehicle.name}</h3>
                  <p>{formatNumber(candidate.vehicle.annualMileageKm)} km/ano</p>
                  <strong>{formatCurrency(candidate.vehicle.vehicleValue)}</strong>
                </div>
                <div className="card-actions">
                  <button className="button button-small button-secondary" onClick={() => setEditor({ kind: 'candidate', record: candidate })}>Editar</button>
                  <button className="button button-small button-ghost" onClick={() => updateState((current) => duplicateCandidate(current, candidate.id, newId()))}>Duplicar</button>
                  <button
                    className="button button-small button-danger"
                    onClick={() => {
                      if (window.confirm(`Excluir ${candidate.vehicle.name}? A simulação associada também será removida.`)) {
                        updateState((current) => deleteCandidate(current, candidate.id))
                      }
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
