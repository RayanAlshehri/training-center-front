import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { entityStatuses, type PagedResult } from '../types'

export function ListToolbar({
  search,
  onSearch,
  searchPlaceholder = 'Search records',
  beforeSearch,
  status,
  onStatus,
  statuses = entityStatuses,
  children,
}: {
  search: string
  onSearch: (value: string) => void
  searchPlaceholder?: string
  beforeSearch?: ReactNode
  status?: string
  onStatus?: (value: string) => void
  statuses?: string[]
  children?: ReactNode
}) {
  return (
    <div className="toolbar">
      {beforeSearch}
      <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} />
      {status !== undefined && onStatus && (
        <Select value={status} onChange={onStatus} label="Status" options={statuses.map((item) => ({ value: item, label: item }))} />
      )}
      {children}
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search records',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="control search-control">
      <span>Search</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function Select({
  value,
  onChange,
  label,
  options,
  includeAllOption = true,
}: {
  value: string | number
  onChange: (value: string) => void
  label: string
  options: { value: string | number; label: string }[]
  includeAllOption?: boolean
}) {
  return (
    <label className="control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {includeAllOption && <option value="">All</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Combobox({
  value,
  onChange,
  label,
  options,
  allLabel = 'All',
  placeholder,
}: {
  value: string | number
  onChange: (value: string) => void
  label: string
  options: { value: string | number; label: string }[]
  allLabel?: string
  placeholder?: string
}) {
  const selected = options.find((option) => String(option.value) === String(value))
  const [query, setQuery] = useState(selected?.label ?? '')
  const [open, setOpen] = useState(false)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = useMemo(
    () =>
      normalizedQuery
        ? options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
        : options,
    [normalizedQuery, options],
  )
  const visibleOptions = filteredOptions.slice(0, 20)

  useEffect(() => {
    if (!open) setQuery(selected?.label ?? '')
  }, [open, selected?.label])

  const chooseOption = (option: { value: string | number; label: string }) => {
    onChange(String(option.value))
    setQuery(option.label)
    setOpen(false)
  }

  const clearSelection = () => {
    onChange('')
    setQuery('')
    setOpen(true)
  }

  return (
    <div className="control combobox-control">
      <span>{label}</span>
      <div className="combobox" onBlur={() => window.setTimeout(() => setOpen(false), 120)}>
        <div className="combobox-input-wrap">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              if (value) onChange('')
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder ?? allLabel}
            aria-label={label}
            aria-expanded={open}
            role="combobox"
          />
          {value && (
            <button
              type="button"
              className="combobox-clear"
              aria-label={`Clear ${label}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearSelection}
            >
              x
            </button>
          )}
        </div>
        {open && (
          <div className="combobox-menu" role="listbox">
            <button type="button" className={!value ? 'active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={clearSelection}>
              {allLabel}
            </button>
            {visibleOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={String(option.value) === String(value) ? 'active' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseOption(option)}
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && <div className="combobox-empty">No matches</div>}
            {filteredOptions.length > visibleOptions.length && (
              <div className="combobox-empty">Keep typing to narrow {filteredOptions.length} matches</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="control">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function TextField({
  name,
  label,
  defaultValue,
  type = 'text',
  required,
}: {
  name: string
  label: string
  defaultValue?: string | number
  type?: string
  required?: boolean
}) {
  return (
    <label className="control">
      <span>{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} required={required} min={type === 'number' ? 0 : undefined} />
    </label>
  )
}

export function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string
  label: string
  defaultValue?: string | number
  options: (string | { value: string | number; label: string })[]
}) {
  const labelText = label || name
  return (
    <label className="control">
      <span>{labelText}</span>
      <select name={name} defaultValue={defaultValue ?? ''} required>
        <option value="" disabled>
          Select {labelText.toLowerCase()}
        </option>
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export function RecordForm({
  children,
  submitLabel,
  onSubmit,
}: {
  children: ReactNode
  submitLabel: string
  onSubmit: (data: FormData) => void
}) {
  return (
    <form
      className="record-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(new FormData(event.currentTarget))
      }}
    >
      <div className="form-grid">{children}</div>
      <div className="form-actions">
        <button className="primary-button" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

export function DataTable({
  columns,
  rows,
  loading,
  emptyText,
}: {
  columns: string[]
  rows: ReactNode[][]
  loading: boolean
  emptyText: string
}) {
  if (loading) return <div className="state-box">Loading records...</div>
  if (rows.length === 0) return <div className="state-box">{emptyText}</div>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatusBadge({ value }: { value?: string | null }) {
  const label = value || 'Unknown'
  return <span className={`status-badge status-${label.toLowerCase()}`}>{label}</span>
}

export function StatusToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      className={`status-switch${checked ? ' active' : ''}`}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="status-switch-track">
        <span className="status-switch-thumb" />
      </span>
      <span className="sr-only">{checked ? 'Active' : 'Inactive'}</span>
    </button>
  )
}

export function RowActions({
  actions,
}: {
  actions: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }[]
}) {
  return (
    <div className="row-actions">
      {actions.map((action) => (
        <button
          key={action.label}
          className={action.danger ? 'danger-button' : 'ghost-button'}
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

export function Pagination<T>({ data, onPage }: { data: PagedResult<T>; onPage: (page: number) => void }) {
  return (
    <div className="pagination">
      <span>
        Page {data.page} of {data.totalPages || 1} · {data.totalCount} records
      </span>
      <div>
        <button type="button" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>
          Previous
        </button>
        <button type="button" disabled={data.page >= data.totalPages} onClick={() => onPage(data.page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

export function PanelHeader({
  title,
  actionLabel,
  onAction,
  disabled,
}: {
  title: string
  actionLabel: string
  onAction: () => void
  disabled?: boolean
}) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <button className="secondary-button" type="button" onClick={onAction} disabled={disabled}>
        {actionLabel}
      </button>
    </div>
  )
}

export function Alert({ tone, message }: { tone: 'error' | 'success' | 'warning'; message: string }) {
  return <div className={`alert ${tone}`}>{message}</div>
}

export function AccessDenied() {
  return (
    <section className="panel">
      <Alert tone="warning" message="You do not have access to this area." />
    </section>
  )
}

export function Segmented({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option}
          className={value === option ? 'active' : ''}
          type="button"
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

