import { Fragment, useMemo, useState } from 'react'
import {
  compareMultipleTcoBreakdowns,
  tcoBreakdownOrder,
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

export function TcoBreakdownTable({ current, options }: {
  readonly current: Vehicle
  readonly options: readonly Vehicle[]
}) {
  const [view, setView] = useState<BreakdownView>('monthly')
  const comparison = useMemo(
    () => compareMultipleTcoBreakdowns(current, options),
    [current, options],
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
      <p className="field-help">Cada diferença segue veículo atual menos a respectiva opção de troca. Valor positivo indica economia.</p>
      <div className="table-scroll tco-breakdown-table">
        <table>
          <thead>
            <tr>
              <th>Componente</th>
              <th>{current.name}</th>
              {comparison.options.map((option, optionIndex) => (
                <Fragment key={`${option.vehicle.name}-${optionIndex}`}>
                  <th>{option.vehicle.name}</th>
                  <th>Dif. {option.vehicle.name}</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {tcoBreakdownOrder.map((component, rowIndex) => {
              const currentValue = comparison.current[component][view]
              return (
                <tr key={component} className={component === 'cashTco' || component === 'economicTco' ? 'tco-total-row' : ''}>
                  <td>{componentLabels[component]}</td>
                  <td>{comparison.current[component].applicable ? formatCurrency(currentValue) : '—'}</td>
                  {comparison.options.map((option, optionIndex) => {
                    const row = option.rows[rowIndex]
                    return (
                      <Fragment key={`${option.vehicle.name}-${optionIndex}`}>
                        <td>{row.option.applicable ? formatCurrency(row.option[view]) : '—'}</td>
                        <td>{!row.current.applicable && !row.option.applicable ? '—' : <DifferenceValue value={row.difference[view]} />}</td>
                      </Fragment>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
