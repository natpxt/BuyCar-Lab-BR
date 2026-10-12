import type { ReactNode } from 'react'
import { Flag, Trophy } from 'lucide-react'
import { AppIcon } from './AppIcon'

export function OutcomeBadge({ children, tone = 'success' }: {
  readonly children: ReactNode
  readonly tone?: 'success' | 'reference' | 'decision' | 'primary'
}) {
  return <span className={`outcome-badge outcome-badge-${tone}`}><AppIcon icon={tone === 'reference' ? Flag : Trophy} size={16} />{children}</span>
}
