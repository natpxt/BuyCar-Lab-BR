import { useMemo, useState } from 'react'
import {
  addCandidate,
  deleteCandidate,
  duplicateCandidate,
  editCandidate,
  setCurrentVehicle,
  type StoredVehicle,
} from '../application/appState'
import { useAppState } from '../application/AppStateProvider'
import { useAuth } from '../application/AuthProvider'
import {
  calculateVehicleCardSummary,
  findLowestMonthlyCashTcoVehicleIds,
  type VehicleCardSummary,
} from '../application/vehicleSummary'
import type { Vehicle } from '../domain/vehicle'
import { formatCurrency, formatNumber } from './format'
import { VehicleForm } from './VehicleForm'
import { OutcomeBadge } from './OutcomeBadge'
import { BadgeDollarSign, CarFront, Copy, Pencil, Plus, Route, Trash2 } from 'lucide-react'
import { AppIcon } from './AppIcon'
import { PowertrainBadge } from './PowertrainBadge'

type EditorTarget =
  | { readonly kind: 'current'; readonly record?: StoredVehicle }
  | { readonly kind: 'candidate'; readonly record?: StoredVehicle }

function OperationalDifference({ value }: { readonly value: number }) {
  if (Math.abs(value) <= 0.005) {
    return <span className="vehicle-cost-difference vehicle-cost-neutral">Mesmo custo operacional</span>
  }
  const saving = value > 0
  return (
    <span className={`vehicle-cost-difference ${saving ? 'vehicle-cost-saving' : 'vehicle-cost-extra'}`}>
      {saving ? 'Economia' : 'Custo adicional'} de {formatCurrency(Math.abs(value))}/mês
    </span>
  )
}

function VehicleMetrics({ summary, currentMonthlyCashTco }: {
  readonly summary: VehicleCardSummary
  readonly currentMonthlyCashTco?: number
}) {
  return (
    <div className="vehicle-cost-summary">
      <div className="vehicle-primary-metric">
        <span>TCO de caixa mensal</span>
        <strong>{formatCurrency(summary.monthlyCashTco)}</strong>
        {currentMonthlyCashTco !== undefined && (
          <OperationalDifference value={currentMonthlyCashTco - summary.monthlyCashTco} />
        )}
      </div>
      <dl className="vehicle-card-metrics">
        <div><dt><AppIcon icon={BadgeDollarSign} />Valor de mercado</dt><dd>{formatCurrency(summary.marketValue)}</dd></div>
        <div><dt><AppIcon icon={Route} />Quilometragem anual</dt><dd>{formatNumber(summary.annualMileageKm)} km/ano</dd></div>
      </dl>
    </div>
  )
}

function newId(): string {
  return crypto.randomUUID()
}

export function VehiclesScreen() {
  const { state, updateState } = useAppState()
  const { user } = useAuth()
  const accountName = typeof user?.user_metadata.display_name === 'string'
    ? user.user_metadata.display_name.trim()
    : ''
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const currentSummary = useMemo(
    () => state.currentVehicle
      ? calculateVehicleCardSummary(state.currentVehicle.vehicle)
      : null,
    [state.currentVehicle],
  )
  const lowestCostIds = useMemo(
    () => findLowestMonthlyCashTcoVehicleIds(state.candidates),
    [state.candidates],
  )

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
        currentMileageKm={state.currentVehicle?.vehicle.annualMileageKm}
        allowCurrentMileage={editor.kind === 'candidate'}
        title={editor.record
          ? `Editar ${current ? 'veículo atual' : 'opção de troca'}`
          : `Cadastrar ${current ? 'veículo atual' : 'opção de troca'}`}
        submitLabel="Salvar veículo"
        onCancel={() => setEditor(null)}
        onSubmit={saveVehicle}
      />
    )
  }

  return (
    <div className="screen-stack vehicles-screen">
      <header className="page-header">
        <div>
          <span className="eyebrow">Seus veículos</span>
          <h1>{accountName ? `Garagem de ${accountName}` : 'Minha garagem'}</h1>
          <p>Cadastre os dados usados nos cálculos de TCO e financiamento.</p>
        </div>
        <button className="button button-primary" onClick={() => setEditor({ kind: 'candidate' })}>
          <AppIcon icon={Plus} size={16} />Adicionar opção
        </button>
      </header>

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow-reference">Veículo atual · referência</span>
            <h2>Base da comparação</h2>
          </div>
        </div>
        {state.currentVehicle && currentSummary ? (
          <article className="vehicle-card vehicle-card-current vehicle-card-reference">
            <OutcomeBadge tone="reference">Veículo atual</OutcomeBadge>
            <div className="vehicle-card-identity">
              <PowertrainBadge powertrain={state.currentVehicle.vehicle.powertrain} reference />
              <h3>{state.currentVehicle.vehicle.name}</h3>
            </div>
            <VehicleMetrics summary={currentSummary} />
            <div className="card-actions">
              <button className="button button-secondary" aria-label="Editar veículo atual" onClick={() => setEditor({ kind: 'current', record: state.currentVehicle ?? undefined })}>
                <AppIcon icon={Pencil} size={16} />Editar
              </button>
            </div>
          </article>
        ) : (
          <div className="empty-state">
            <AppIcon icon={CarFront} size={24} />
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
            <span className="eyebrow">Alternativas · {state.candidates.length}</span>
            <h2>Opções de troca</h2>
          </div>
        </div>
        {state.candidates.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhuma opção de troca cadastrada</h3>
            <p>Adicione um veículo para comparar custos e simular a compra.</p>
          </div>
        ) : (
          <div className="card-grid vehicle-options-grid">
            {state.candidates.map((candidate) => {
              const summary = calculateVehicleCardSummary(candidate.vehicle)
              const lowestCost = lowestCostIds.length === 1 && lowestCostIds[0] === candidate.id
              return (
                <article className={`vehicle-card vehicle-option-card ${lowestCost ? 'vehicle-card-lowest-cost' : ''}`} key={candidate.id}>
                  <div className="vehicle-card-heading">
                    <PowertrainBadge powertrain={candidate.vehicle.powertrain} />
                    {lowestCost && <OutcomeBadge>Mais econômico</OutcomeBadge>}
                  </div>
                  <div className="vehicle-card-identity">
                    <h3>{candidate.vehicle.name}</h3>
                  </div>
                  <VehicleMetrics
                    summary={summary}
                    currentMonthlyCashTco={currentSummary?.monthlyCashTco}
                  />
                  <div className="card-actions">
                    <button className="button button-small button-secondary" onClick={() => setEditor({ kind: 'candidate', record: candidate })}><AppIcon icon={Pencil} size={16} />Editar</button>
                    <button className="button button-small button-ghost" onClick={() => updateState((current) => duplicateCandidate(current, candidate.id, newId()))}><AppIcon icon={Copy} size={16} />Duplicar</button>
                    <button
                      className="button button-small button-danger button-danger-quiet"
                      onClick={() => {
                        if (window.confirm(`Excluir ${candidate.vehicle.name}? A simulação associada também será removida.`)) {
                          updateState((current) => deleteCandidate(current, candidate.id))
                        }
                      }}
                    >
                      <AppIcon icon={Trash2} size={16} />Excluir
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
