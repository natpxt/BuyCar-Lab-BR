import { Fragment, useMemo, useState } from 'react'
import {
  compareMultipleTcoBreakdowns,
  tcoBreakdownOrder,
  type TcoBreakdownComponent,
} from '../application/tcoBreakdown'
import type { Vehicle } from '../domain/vehicle'
import { formatCurrency } from './format'
import { Calculator, FileText, Fuel, IdCard, ShieldCheck, TrendingDown, Wrench, Zap } from 'lucide-react'
import { AppIcon } from './AppIcon'

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

const componentIcons = { fuel: Fuel, electricity: Zap, maintenance: Wrench, insurance: ShieldCheck, propertyTax: FileText, licensing: IdCard, cashTco: Calculator, depreciation: TrendingDown, economicTco: Calculator }

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
    <section className="data-card tco-breakdown-board">
      <div className="section-heading tco-breakdown-heading">
        <div><span className="eyebrow">Composição do TCO</span><h2>Comparação detalhada dos custos</h2></div>
        <div className="segmented-control compact-segmented" aria-label="Periodicidade do detalhamento">
          <button type="button" className={view === 'monthly' ? 'active' : ''} aria-pressed={view === 'monthly'} onClick={() => setView('monthly')}>Mensal</button>
          <button type="button" className={view === 'annual' ? 'active' : ''} aria-pressed={view === 'annual'} onClick={() => setView('annual')}>Anual</button>
        </div>
      </div>
      <p className="field-help">Diferença = veículo atual menos opção de troca. Valor positivo indica economia operacional.</p>
      <div className="table-scroll tco-breakdown-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Componente</th>
              <th scope="col" className="reference-text">{current.name}</th>
              {comparison.options.map((option, optionIndex) => (
                <Fragment key={`${option.vehicle.name}-${optionIndex}`}>
                  <th scope="col">{option.vehicle.name}</th>
                  <th scope="col">{options.length === 1 ? 'Diferença' : <>Diferença<br /><small>{option.vehicle.name}</small></>}</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {tcoBreakdownOrder.map((component, rowIndex) => {
              const currentValue = comparison.current[component][view]
              return (
                <Fragment key={component}>
                  {(component === 'fuel' || component === 'cashTco') && (
                    <tr className="tco-category-row">
                      <th scope="rowgroup" colSpan={2 + comparison.options.length * 2}>
                        {component === 'fuel' ? 'Custos operacionais' : 'Totais e visão econômica'}
                      </th>
                    </tr>
                  )}
                  <tr className={component === 'cashTco' || component === 'economicTco' ? 'tco-total-row' : ''}>
                    <th scope="row"><span className="table-component-label"><AppIcon icon={componentIcons[component]} size={16} />{componentLabels[component]}</span></th>
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
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
