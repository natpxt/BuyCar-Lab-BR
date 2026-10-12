import type { LucideIcon } from 'lucide-react'
import { AppIcon } from './AppIcon'

export function SectionHeader({ icon, title, description, eyebrow, level = 'h3' }: {
  readonly icon: LucideIcon
  readonly title: string
  readonly description?: string
  readonly eyebrow?: string
  readonly level?: 'h2' | 'h3'
}) {
  const Heading = level
  return (
    <div className="section-header">
      <span className="section-header-icon"><AppIcon icon={icon} /></span>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <Heading>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
    </div>
  )
}
