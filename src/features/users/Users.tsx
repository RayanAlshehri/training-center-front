import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { api } from '../../services/api'
import type { ModalState } from '../../app/types'
import type { CreateUserRequest, Tenant, UpdateUserRequest, UserAccount } from '../../types'
import { Alert, DataTable, Field, ListToolbar, Pagination, PanelHeader, RecordForm, RowActions, Select, SelectField, StatusBadge, TextField } from '../../components/ui'
import { firstNameFromUser, isTenantRole, lastNameFromUser, normalizeRoles, nullable, rolesForCurrentUser, tenantIdValue, tenantName, tenantsPageFrom, tenantStatus, userDisplayName, userEmail, userId, userIsActive, userPhone, userPhoneValue, userRole, usersPageFrom, userTenantId, userTenantName } from '../../shared/helpers'
import { usePagedData } from '../../shared/hooks'

type UserSearchField = 'fullName' | 'email' | 'phone'

const userSearchFields: { value: UserSearchField; label: string }[] = [
  { value: 'fullName', label: 'Full name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
]

export function UsersPage({
  onModal,
  refreshToken,
  canManage,
}: {
  onModal: (modal: ModalState) => void
  refreshToken: number
  canManage: boolean
}) {
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState<UserSearchField>('fullName')
  const [page, setPage] = useState(1)
  const { data, loading, error } = usePagedData(
    () => api.users.list({ search, searchField, page, pageSize: 20 }).then(usersPageFrom),
    [search, searchField, page, refreshToken],
  )

  const updateSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const updateSearchField = (value: string) => {
    setSearchField(value as UserSearchField)
    setPage(1)
  }

  return (
    <section className="panel">
      <PanelHeader
        title="Users"
        actionLabel="New user"
        onAction={() => onModal({ type: 'user' })}
        disabled={!canManage}
      />
      <ListToolbar
        search={search}
        onSearch={updateSearch}
        searchPlaceholder={`Search by ${userSearchFields.find((item) => item.value === searchField)?.label.toLowerCase()}`}
        beforeSearch={
          <Select value={searchField} onChange={updateSearchField} label="Search by" options={userSearchFields} includeAllOption={false} />
        }
      />
      {!canManage && <Alert tone="warning" message="You need Users.Manage permission to create users or change role/status." />}
      {error && <Alert tone="error" message={error} />}
      <DataTable
        loading={loading}
        emptyText="No users match the current filters."
        columns={['Name', 'Email', 'Phone', 'Role', 'Tenant', 'Status', 'Actions']}
        rows={data.items.map((item) => [
            <strong>{userDisplayName(item)}</strong>,
            userEmail(item),
            userPhone(item),
            userRole(item),
            userTenantName(item) || '-',
            <StatusBadge value={userIsActive(item) ? 'Active' : 'Inactive'} />,
            canManage ? (
              <RowActions actions={[{ label: 'Edit', onClick: () => onModal({ type: 'user', item }) }]} />
            ) : (
              <span className="muted">No access</span>
            ),
          ])}
      />
      <Pagination data={data} onPage={setPage} />
    </section>
  )
}

export function UserModalForm({
  item,
  onSubmit,
}: {
  item?: UserAccount
  onSubmit: (item: UserAccount | undefined, body: CreateUserRequest | UpdateUserRequest) => void
}) {
  const [loadedItem, setLoadedItem] = useState<UserAccount | undefined>(() => (item ? undefined : item))
  const [loading, setLoading] = useState(Boolean(item))
  const [error, setError] = useState('')
  const editUserId = item ? userId(item) : 0

  useEffect(() => {
    if (!item) {
      setLoadedItem(undefined)
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    api.users
      .get(editUserId)
      .then((result) => setLoadedItem(result))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [editUserId, item])

  if (loading) return <div className="state-box">Loading user...</div>
  if (error) return <Alert tone="error" message={error} />

  return (
    <UserForm
      key={loadedItem ? userId(loadedItem) : 'new-user'}
      item={loadedItem}
      onSubmit={(body) => onSubmit(loadedItem, body)}
    />
  )
}

export function UserForm({
  item,
  onSubmit,
}: {
  item?: UserAccount
  onSubmit: (body: CreateUserRequest | UpdateUserRequest) => void
}) {
  const { isSuperAdmin, isTenantAdmin } = useAuth()
  const [roles, setRoles] = useState<string[]>(() => rolesForCurrentUser(normalizeRoles(undefined), isSuperAdmin, isTenantAdmin))
  const [roleName, setRoleName] = useState(() => (item ? userRole(item) : '') || (isSuperAdmin ? 'TenantAdmin' : 'OperationsStaff'))
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantError, setTenantError] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    api.users
      .roles()
      .then((result) => {
        const allowedRoles = rolesForCurrentUser(normalizeRoles(result), isSuperAdmin, isTenantAdmin)
        setRoles(allowedRoles)
        setRoleName((current) => (allowedRoles.includes(current) ? current : allowedRoles[0] ?? ''))
      })
      .catch(() => {
        const allowedRoles = rolesForCurrentUser(normalizeRoles(undefined), isSuperAdmin, isTenantAdmin)
        setRoles(allowedRoles)
        setRoleName((current) => (allowedRoles.includes(current) ? current : allowedRoles[0] ?? ''))
      })
  }, [isSuperAdmin, isTenantAdmin])

  useEffect(() => {
    if (!isSuperAdmin) return
    api.tenants
      .list()
      .then((result) => setTenants(tenantsPageFrom(result).items.filter((tenant) => tenantStatus(tenant) === 'Active')))
      .catch((err: Error) => setTenantError(err.message))
  }, [isSuperAdmin])

  return (
    <RecordForm
      submitLabel={item ? 'Save user' : 'Create user'}
      onSubmit={(data) => {
        const selectedRole = String(data.get('roleName'))
        const tenantId = nullable(data.get('tenantId'))
        if (isSuperAdmin && isTenantRole(selectedRole) && !tenantId) {
          setFormError('Select a tenant for tenant users.')
          return
        }
        setFormError('')

        const body = {
          firstName: String(data.get('firstName')),
          lastName: String(data.get('lastName')),
          phone: String(data.get('phone')),
          email: String(data.get('email')),
          roleName: selectedRole,
          ...(isSuperAdmin && isTenantRole(selectedRole) ? { tenantId } : {}),
          isActive: data.get('isActive') === 'on',
        }

        onSubmit(
          item
            ? body
            : {
                ...body,
                password: String(data.get('password')),
              },
        )
      }}
    >
      {formError && <Alert tone="error" message={formError} />}
      {tenantError && <Alert tone="error" message={tenantError} />}
      <TextField name="firstName" label="First name" defaultValue={firstNameFromUser(item)} required />
      <TextField name="lastName" label="Last name" defaultValue={lastNameFromUser(item)} required />
      <TextField name="phone" label="Phone" defaultValue={userPhoneValue(item)} required />
      <TextField name="email" label="Email" type="email" defaultValue={item ? userEmail(item) : ''} required />
      {!item && <TextField name="password" label="Password" type="password" required />}
      <Field label="Role">
        <select name="roleName" value={roleName} onChange={(event) => setRoleName(event.target.value)} required>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </Field>
      {isSuperAdmin && isTenantRole(roleName) && (
        <SelectField
          name="tenantId"
          label="Tenant"
          defaultValue={item ? userTenantId(item) : undefined}
          options={tenants.map((tenant) => ({ value: tenantIdValue(tenant), label: tenantName(tenant) }))}
        />
      )}
      <Field label="Status">
        <span className="checkbox-control">
          <input name="isActive" type="checkbox" defaultChecked={item ? userIsActive(item) : true} />
          Active
        </span>
      </Field>
    </RecordForm>
  )
}


