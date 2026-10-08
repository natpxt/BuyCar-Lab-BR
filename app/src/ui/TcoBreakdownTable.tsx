import { useMemo, useState } from 'react'
import {
  compareTcoBreakdowns,
  type TcoBreakdownComponent,
} from '../application/tcoBreakdown'
import type { Vehicle } from '../domain/vehicle'
import { formatCurrency } from './format'

type BreakdownView = 'monthly' | 'annual'

const componentLabels: Readonly<Record<TcoBreakdownComponent, string>> = {
  fuel: 'Combustível',
  electricity: 'Energia elétrica',
  maintenance: 'Manutenção',
  insurance: 'Seguro',
  propertyTax: 'IPVA',
  licensing: 'Licenciamento',
  cashTco: 'TCO de caixa',
  depreciation: 'Depreciação',
  economicTco: 'TCO econômico',
}

function DifferenceValue({ value }: { readonly value: number }) {
  if (value > 0) {
    return <span className="cost-difference cost-difference-saving"><strong>+ {formatCurrency(value)}</strong><small>Economia</small></span>
  }
  if (value < 0) {
    return <span className="cost-difference cost-difference-cost"><strong>- {formatCurrency(Math.abs(value))}</strong><small>Custo adicional</small></span>
  }
  return <span className="cost-difference"><strong>{formatCurrency(0)}</strong><small>Neutro</small></span>
}

export function TcoBreakdownTable({ current, option }: {
  readonly current: Vehicle
  readonly option: Vehicle
}) {
  const [view, setView] = useState<BreakdownView>('monthly')
  const rows = useMemo(
    () => compareTcoBreakdowns(current, option),
    [current, option],
  )

  return (
    <section className="data-card">
      <div className="section-heading">
        <div><span className="eyebrow">Composição do TCO</span><h2>Comparação detalhada dos custos</h2></div>
        <div className="segmented-control compact-segmented" aria-label="Periodicidade do detalhamento">
          <button type="button" className={view === 'monthly' ? 'active' : ''} onClick={() => setView('monthly')}>Mensal</button>
          <button type="button" className={view === 'annual' ? 'active' : ''} onClick={() => setView('annual')}>Anual</button>
        </div>
      </div>
      <p className="field-help">A diferença segue veículo atual menos opção de troca. Valor positivo indica economia com {option.name}.</p>
      <div className="table-scroll tco-breakdown-table">
        <table>
          <thead><tr><th>Componente</th><th>{current.name}</th><th>{option.name}</th><th>Diferença</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const currentValue = row.current[view]
              const optionValue = row.option[view]
              const difference = row.difference[view]
              return (
                <tr key={row.component} className={row.component === 'cashTco' || row.component === 'economicTco' ? 'tco-total-row' : ''}>
                  <td>{componentLabels[row.component]}</td>
                  <td>{row.current.applicable ? formatCurrency(currentValue) : '—'}</td>
                  <td>{row.option.applicable ? formatCurrency(optionValue) : '—'}</td>
                  <td>{!row.current.applicable && !row.option.applicable ? '—' : <DifferenceValue value={difference} />}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
