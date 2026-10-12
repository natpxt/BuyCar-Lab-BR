import { Fuel, Leaf, Zap } from 'lucide-react'
import type { Powertrain } from '../domain/vehicle'
import { AppIcon } from './AppIcon'

const labels = { ICE: 'Combustão', HEV: 'Híbrido', PHEV: 'Híbrido plug-in', BEV: 'Elétrico' }

export function PowertrainBadge({ powertrain, reference = false }: {
  readonly powertrain: Powertrain
  readonly reference?: boolean
}) {
  return <span className={`tag ${reference ? 'tag-reference' : ''}`}><AppIcon icon={powertrain === 'BEV' ? Zap : powertrain === 'ICE' ? Fuel : Leaf} />{labels[powertrain]}</span>
}
