export function CheckboxOption({ title, description, checked, disabled = false, onChange }: {
  readonly title: string
  readonly description?: string
  readonly checked: boolean
  readonly disabled?: boolean
  onChange(checked: boolean): void
}) {
  return (
    <label className={`checkbox-option ${checked ? 'checkbox-option-active' : ''} ${disabled ? 'checkbox-option-disabled' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span><strong>{title}</strong>{description && <small>{description}</small>}</span>
    </label>
  )
}
