import type { LucideIcon } from 'lucide-react'

export function AppIcon({ icon: Icon, size = 20, className = '' }: {
  readonly icon: LucideIcon
  readonly size?: 16 | 20 | 24
  readonly className?: string
}) {
  return <Icon className={`app-icon ${className}`} size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" />
}
