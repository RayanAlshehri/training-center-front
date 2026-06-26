import { useState } from 'react'
import { api } from '../../services/api'
import type { ModalState } from '../../app/types'
import type { Tenant } from '../../types'
import { Alert, DataTable, Field, PanelHeader, RecordForm, RowActions, StatusBadge, TextField } from '../../components/ui'
import { formatDate, tenantCreatedAt, tenantIdValue, tenantName, tenantSlug, tenantsPageFrom, tenantStatus, tenantUpdatedAt } from '../../shared/helpers'
import { usePagedData } from '../../shared/hooks'

export function TenantsPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
  const [localRefreshToken, setLocalRefreshToken] = useState(0)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const { data, loading, error } = usePagedData(
    () => api.tenants.list().then(tenantsPageFrom),
    [refreshToken, localRefreshToken],
  )

  const refresh = () => setLocalRefreshToken((value) => value + 1)

  const changeStatus = async (tenant: Tenant, nextStatus: 'Suspended' | 'Active') => {
    const verb = nextStatus === 'Suspended' ? 'suspend' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${verb} ${tenantName(tenant)}?`)) return
    setMessage('')
    setActionError('')
    try {
      if (nextStatus === 'Suspended') {
        await api.tenants.suspend(tenantIdValue(tenant))
      } else {
        await api.tenants.reactivate(tenantIdValue(tenant))
      }
      setMessage(`Tenant ${nextStatus === 'Suspended' ? 'suspended' : 'reactivated'}.`)
      refresh()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  return (
    <section className="panel">
      <PanelHeader title="Tenants" actionLabel="New tenant" onAction={() => onModal({ type: 'tenant' })} />
      {message && <Alert tone="success" message={message} />}
      {(error || actionError) && <Alert tone="error" message={error || actionError} />}
      <DataTable
        loading={loading}
        emptyText="No tenants found."
        columns={['Name', 'Slug', 'Status', 'CreatedAt', 'UpdatedAt', 'Actions']}
        rows={data.items.map((item) => {
          const status = tenantStatus(item)
          return [
            <strong>{tenantName(item)}</strong>,
            tenantSlug(item),
            <StatusBadge value={status} />,
            formatDate(tenantCreatedAt(item)),
            formatDate(tenantUpdatedAt(item)),
            <RowActions
              actions={[
                { label: 'View/Edit', onClick: () => onModal({ type: 'tenant', item }) },
                status === 'Suspended'
                  ? { label: 'Reactivate', onClick: () => void changeStatus(item, 'Active') }
                  : { label: 'Suspend', danger: true, onClick: () => void changeStatus(item, 'Suspended') },
              ]}
            />,
          ]
        })}
      />
    </section>
  )
}

export function TenantForm({ item, onSubmit }: { item?: Tenant; onSubmit: (body: { name: string; slug: string }) => void }) {
  const [slug, setSlug] = useState(item ? tenantSlug(item) : '')
  const [error, setError] = useState('')

  return (
    <RecordForm
      submitLabel={item ? 'Save tenant' : 'Create tenant'}
      onSubmit={(data) => {
        const nextSlug = String(data.get('slug')).trim()
        if (!/^[a-z0-9-]+$/.test(nextSlug)) {
          setError('Slug can use lowercase letters, numbers, and hyphens only.')
          return
        }
        setError('')
        onSubmit({
          name: String(data.get('name')).trim(),
          slug: nextSlug,
        })
      }}
    >
      {error && <Alert tone="error" message={error} />}
      <TextField name="name" label="Name" defaultValue={item ? tenantName(item) : ''} required />
      <Field label="Slug">
        <input
          name="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value.toLowerCase())}
          pattern="[a-z0-9-]+"
          required
        />
      </Field>
    </RecordForm>
  )
}

