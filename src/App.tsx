import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { api } from './services/api'
import {
  attendanceStatuses,
  batchStatuses,
  daysOfWeek,
  entityStatuses,
  type AttendanceRecord,
  type AttendanceStatus,
  type Batch,
  type BatchStatus,
  type Certificate,
  type CreateUserRequest,
  type Course,
  type DayOfWeek,
  type EntityStatus,
  type Instructor,
  type PagedResult,
  type Schedule,
  type Tenant,
  type TodaysClass,
  type Trainee,
  type UpdateUserRequest,
  type UserAccount,
} from './types'

type RouteKey =
  | 'dashboard'
  | 'trainees'
  | 'courses'
  | 'instructors'
  | 'batches'
  | 'schedules'
  | 'attendance'
  | 'certificates'
  | 'users'
  | 'platform-tenants'

type ModalState =
  | { type: 'trainee'; item?: Trainee }
  | { type: 'course'; item?: Course }
  | { type: 'instructor'; item?: Instructor }
  | { type: 'batch'; item?: Batch }
  | { type: 'schedule'; item?: Schedule }
  | { type: 'certificate' }
  | { type: 'user'; item?: UserAccount }
  | { type: 'tenant'; item?: Tenant }
  | { type: 'batchTrainees'; item: Batch }
  | { type: 'traineeHistory'; item: Trainee; tab: 'attendance' | 'certificates' }
  | null

const navItems: { key: RouteKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '▦' },
  { key: 'trainees', label: 'Trainees', icon: '◉' },
  { key: 'courses', label: 'Courses', icon: '□' },
  { key: 'instructors', label: 'Instructors', icon: '◇' },
  { key: 'batches', label: 'Batches', icon: '▤' },
  { key: 'schedules', label: 'Schedules', icon: '◷' },
  { key: 'attendance', label: 'Attendance', icon: '✓' },
  { key: 'certificates', label: 'Certificates', icon: '✦' },
  { key: 'users', label: 'Users', icon: 'U' },
  { key: 'platform-tenants', label: 'Tenants', icon: 'T' },
]

const routeTitles: Record<RouteKey, string> = {
  dashboard: 'Operations Dashboard',
  trainees: 'Trainees',
  courses: 'Courses',
  instructors: 'Instructors',
  batches: 'Batches',
  schedules: 'Schedules',
  attendance: 'Attendance',
  certificates: 'Certificates',
  users: 'User Management',
  'platform-tenants': 'Tenant Management',
}

const blankPage = <T,>(pageSize = 20): PagedResult<T> => ({
  items: [],
  page: 1,
  pageSize,
  totalCount: 0,
  totalPages: 1,
})

function arrayFrom<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const record = value as { items?: unknown; Items?: unknown; data?: unknown; Data?: unknown; value?: unknown; Value?: unknown }
    if (Array.isArray(record.items)) return record.items as T[]
    if (Array.isArray(record.Items)) return record.Items as T[]
    if (Array.isArray(record.data)) return record.data as T[]
    if (Array.isArray(record.Data)) return record.Data as T[]
    if (Array.isArray(record.value)) return record.value as T[]
    if (Array.isArray(record.Value)) return record.Value as T[]
    if (record.items) return arrayFrom<T>(record.items)
    if (record.Items) return arrayFrom<T>(record.Items)
    if (record.data) return arrayFrom<T>(record.data)
    if (record.Data) return arrayFrom<T>(record.Data)
    if (record.value) return arrayFrom<T>(record.value)
    if (record.Value) return arrayFrom<T>(record.Value)
  }
  return []
}

function numberFrom(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function recordFrom(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return ''
}

function numberField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    const numberValue = Number(value)
    if (Number.isFinite(numberValue) && numberValue > 0) return numberValue
  }
  return 0
}

function normalizeTrainee(value: unknown): Trainee | null {
  const wrapper = recordFrom(value)
  const nested = wrapper.trainee ?? wrapper.Trainee
  const hasNestedTrainee = nested && typeof nested === 'object'
  const source = hasNestedTrainee ? recordFrom(nested) : wrapper
  const id = hasNestedTrainee
    ? numberField(source, 'id', 'Id') || numberField(wrapper, 'traineeId', 'TraineeId')
    : numberField(wrapper, 'traineeId', 'TraineeId') || numberField(source, 'id', 'Id')

  if (!id) return null

  return {
    ...(source as Partial<Trainee>),
    id,
    firstName: stringField(source, 'firstName', 'FirstName', 'fisrtName', 'FisrtName'),
    lastName: stringField(source, 'lastName', 'LastName'),
    phone: stringField(source, 'phone', 'Phone', 'mobile', 'Mobile'),
    nationalId: stringField(source, 'nationalId', 'NationalId') || null,
    registrationDate: stringField(source, 'registrationDate', 'RegistrationDate'),
    status: (stringField(source, 'status', 'Status') || undefined) as Trainee['status'],
    traineeName: stringField(source, 'traineeName', 'TraineeName', 'fullName', 'FullName') || stringField(wrapper, 'traineeName', 'TraineeName'),
  } as Trainee
}

function normalizeTrainees(value: unknown) {
  return arrayFrom<unknown>(value).map(normalizeTrainee).filter((item): item is Trainee => item !== null)
}

function normalizeCertificate(value: unknown): Certificate | null {
  const record = recordFrom(value)
  const id = numberField(record, 'id', 'Id')

  if (!id) return null

  return {
    ...(record as Partial<Certificate>),
    id,
    certificateNumber: stringField(record, 'certificateNumber', 'CertificateNumber'),
    traineeId: numberField(record, 'traineeId', 'TraineeId'),
    traineeName: stringField(record, 'traineeName', 'TraineeName'),
    courseId: numberField(record, 'courseId', 'CourseId'),
    courseName: stringField(record, 'courseName', 'CourseName'),
    batchId: numberField(record, 'batchId', 'BatchId'),
    batchCode: stringField(record, 'batchCode', 'BatchCode'),
    issueDate: stringField(record, 'issueDate', 'IssueDate'),
    completionDate: stringField(record, 'completionDate', 'CompletionDate'),
  } as Certificate
}

function normalizeCertificates(value: unknown) {
  return arrayFrom<unknown>(value).map(normalizeCertificate).filter((item): item is Certificate => item !== null)
}

function userDisplayName(user: UserAccount) {
  const record = recordFrom(user)
  const fullName = stringField(record, 'fullName', 'FullName')
  const firstName = stringField(record, 'firstName', 'FirstName')
  const lastName = stringField(record, 'lastName', 'LastName')
  return fullName || [firstName, lastName].filter(Boolean).join(' ') || stringField(record, 'email', 'Email')
}

function firstNameFromUser(user?: UserAccount) {
  return user ? stringField(recordFrom(user), 'firstName', 'FirstName') : ''
}

function lastNameFromUser(user?: UserAccount) {
  return user ? stringField(recordFrom(user), 'lastName', 'LastName') : ''
}

function userRole(user: UserAccount) {
  return stringField(recordFrom(user), 'roleName', 'RoleName', 'role', 'Role') || '-'
}

function userEmail(user: UserAccount) {
  return stringField(recordFrom(user), 'email', 'Email')
}

function userId(user: UserAccount) {
  return numberField(recordFrom(user), 'id', 'Id', 'userId', 'UserId')
}

function userTenantName(user: UserAccount) {
  return stringField(recordFrom(user), 'tenantName', 'TenantName')
}

function userTenantId(user: UserAccount) {
  const record = recordFrom(user)
  const value = record.tenantId ?? record.TenantId
  return value === null || value === undefined ? '' : String(value)
}

function userIsActive(user: UserAccount) {
  const record = recordFrom(user)
  return Boolean(record.isActive ?? record.IsActive)
}

function normalizeRoles(value: unknown) {
  const roles = arrayFrom<unknown>(value)
    .map((role) => {
      if (typeof role === 'string') return role
      if (role && typeof role === 'object') {
        const record = role as Record<string, unknown>
        return stringField(record, 'displayName', 'DisplayName', 'name', 'Name', 'roleName', 'RoleName')
      }
      return ''
    })
    .filter((role) => role.length > 0)

  return roles.length ? roles : ['SuperAdmin', 'TenantAdmin', 'OperationsStaff', 'Instructor']
}

function normalizeRoleKey(role: string) {
  return role.replace(/\s+/g, '').toLowerCase()
}

function rolesForCurrentUser(roles: string[], isSuperAdmin: boolean, isTenantAdmin: boolean) {
  const fallback = ['SuperAdmin', 'TenantAdmin', 'OperationsStaff', 'Instructor']
  const source = roles.length ? roles : fallback

  if (isSuperAdmin) return source
  if (isTenantAdmin) {
    return source.filter((role) => ['tenantadmin', 'operationsstaff', 'instructor'].includes(normalizeRoleKey(role)))
  }
  return []
}

function isTenantRole(role: string) {
  return ['tenantadmin', 'operationsstaff', 'instructor'].includes(normalizeRoleKey(role))
}

function usersPageFrom(value: unknown): PagedResult<UserAccount> {
  if (Array.isArray(value)) {
    return {
      items: value as UserAccount[],
      page: 1,
      pageSize: value.length,
      totalCount: value.length,
      totalPages: 1,
    }
  }

  return pagedFrom<UserAccount>(value)
}

function tenantsPageFrom(value: unknown): PagedResult<Tenant> {
  if (Array.isArray(value)) {
    return {
      items: value as Tenant[],
      page: 1,
      pageSize: value.length,
      totalCount: value.length,
      totalPages: 1,
    }
  }

  return pagedFrom<Tenant>(value)
}

function tenantIdValue(tenant: Tenant) {
  return numberField(recordFrom(tenant), 'id', 'Id')
}

function tenantName(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'name', 'Name')
}

function tenantSlug(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'slug', 'Slug')
}

function tenantStatus(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'status', 'Status') || 'Active'
}

function tenantCreatedAt(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'createdAt', 'CreatedAt')
}

function tenantUpdatedAt(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'updatedAt', 'UpdatedAt')
}

function certificatePageFrom(value: unknown) {
  const page = pagedFrom<Certificate>(value)
  return {
    ...page,
    items: normalizeCertificates(value),
  }
}

function pagedFrom<T>(value: unknown, pageSize = 20): PagedResult<T> {
  if (value && typeof value === 'object') {
    const record = value as Partial<PagedResult<T>> & {
      Items?: unknown
      data?: unknown
      Data?: unknown
      Page?: number
      PageSize?: number
      TotalCount?: number
      TotalPages?: number
    }
    const items = arrayFrom<T>(record.items ?? record.Items ?? record.data ?? record.Data)

    return {
      items,
      page: numberFrom(record.page ?? record.Page, 1),
      pageSize: numberFrom(record.pageSize ?? record.PageSize, pageSize),
      totalCount: numberFrom(record.totalCount ?? record.TotalCount, items.length),
      totalPages: numberFrom(record.totalPages ?? record.TotalPages, 1),
    }
  }

  return blankPage<T>(pageSize)
}

const today = () => new Date().toISOString().slice(0, 10)
const formatDate = (value?: string | null) => (value ? new Intl.DateTimeFormat('en-SA').format(new Date(value)) : '-')
const formatTime = (value?: string | null) => (value ? value.slice(0, 5) : '-')
const timeInputValue = (value?: string | null, fallback = '') => (value ? value.slice(0, 5) : fallback)
const timeForApi = (value: FormDataEntryValue | null) => {
  const time = String(value ?? '').trim()
  return time.length === 5 ? `${time}:00` : time
}

function routeFromPath(): RouteKey {
  const path = window.location.pathname.replace(/\/$/, '')
  if (path === '/platform/tenants') return 'platform-tenants'
  const segment = path.replace(/^\//, '') as RouteKey
  return navItems.some((item) => item.key === segment) ? segment : 'dashboard'
}

function pathForRoute(route: RouteKey) {
  if (route === 'dashboard') return '/'
  if (route === 'platform-tenants') return '/platform/tenants'
  return `/${route}`
}

function App() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <AdminShell />
}

function AdminShell() {
  const { user, logout, hasPermission, isSuperAdmin, isTenantAdmin, isOperationsStaff, isInstructor, isTenantUser } = useAuth()
  const [route, setRoute] = useState<RouteKey>(routeFromPath)
  const [modal, setModal] = useState<ModalState>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const canViewUsers = isSuperAdmin || isTenantAdmin || hasPermission('Users.View')
  const canManageUsers = isSuperAdmin || isTenantAdmin || hasPermission('Users.Manage')
  const visibleNavItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (isSuperAdmin) {
          return item.key === 'platform-tenants' || item.key === 'users'
        }

        if (item.key === 'platform-tenants') return false
        if (item.key === 'users') return isTenantAdmin && canViewUsers
        if (isInstructor) {
          return item.key === 'dashboard' || item.key === 'batches' || item.key === 'schedules' || item.key === 'attendance'
        }

        return isTenantAdmin || isOperationsStaff || isTenantUser
      }),
    [canViewUsers, isInstructor, isOperationsStaff, isSuperAdmin, isTenantAdmin, isTenantUser],
  )
  const canAccessRoute = visibleNavItems.some((item) => item.key === route)

  useEffect(() => {
    const onPopState = () => setRoute(routeFromPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (next: RouteKey) => {
    setRoute(next)
    window.history.pushState({}, '', pathForRoute(next))
  }

  useEffect(() => {
    if (canAccessRoute) return
    const nextRoute = visibleNavItems[0]?.key ?? 'dashboard'
    setRoute(nextRoute)
    window.history.pushState({}, '', pathForRoute(nextRoute))
  }, [canAccessRoute, visibleNavItems])

  const refresh = () => setRefreshToken((value) => value + 1)

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark">TC</span>
          <div>
            <strong>Training Ops</strong>
            <span>Saudi institutes</span>
          </div>
        </div>
        <nav>
          {visibleNavItems.map((item) => (
            <button
              key={item.key}
              className={route === item.key ? 'nav-link active' : 'nav-link'}
              type="button"
              onClick={() => navigate(item.key)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="api-pill">
          <span>API</span>
          <strong>{api.baseUrl}</strong>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Professional training operations</p>
            <h1>{routeTitles[route]}</h1>
          </div>
          <div className="topbar-actions">
            <QuickAction route={route} onAction={setModal} canManageUsers={canManageUsers} isSuperAdmin={isSuperAdmin} />
            <div className="user-menu">
              <span>
                <strong>{user?.fullName}</strong>
                <small>{user?.role}</small>
              </span>
              <button className="secondary-button" type="button" onClick={() => void logout()}>
                Logout
              </button>
            </div>
          </div>
        </header>

        {!canAccessRoute && <AccessDenied />}
        {canAccessRoute && route === 'dashboard' && <DashboardPage onOpen={navigate} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'trainees' && <TraineesPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'courses' && <CoursesPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'instructors' && <InstructorsPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'batches' && <BatchesPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'schedules' && <SchedulesPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'attendance' && <AttendancePage refreshToken={refreshToken} />}
        {canAccessRoute && route === 'certificates' && <CertificatesPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'platform-tenants' && <TenantsPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'users' && (
          canViewUsers ? (
            <UsersPage onModal={setModal} refreshToken={refreshToken} canManage={canManageUsers} />
          ) : (
            <section className="panel">
              <Alert tone="warning" message="You need Users.View permission to open user management." />
            </section>
          )
        )}
      </main>

      <AppModal modal={modal} refreshToken={refreshToken} onClose={() => setModal(null)} onSaved={refresh} />
    </div>
  )
}

function QuickAction({
  route,
  onAction,
  canManageUsers,
  isSuperAdmin,
}: {
  route: RouteKey
  onAction: (modal: ModalState) => void
  canManageUsers: boolean
  isSuperAdmin: boolean
}) {
  const config: Partial<Record<RouteKey, { label: string; modal: ModalState }>> = {
    trainees: { label: 'New trainee', modal: { type: 'trainee' } },
    courses: { label: 'New course', modal: { type: 'course' } },
    instructors: { label: 'New instructor', modal: { type: 'instructor' } },
    batches: { label: 'New batch', modal: { type: 'batch' } },
    schedules: { label: 'New schedule', modal: { type: 'schedule' } },
    certificates: { label: 'Generate certificate', modal: { type: 'certificate' } },
    ...(canManageUsers ? { users: { label: 'New user', modal: { type: 'user' } } } : {}),
    ...(isSuperAdmin ? { 'platform-tenants': { label: 'New tenant', modal: { type: 'tenant' } } } : {}),
  }
  const action = config[route]
  if (!action) return <span className="muted">Today: {formatDate(today())}</span>
  return (
    <button className="primary-button" type="button" onClick={() => onAction(action.modal)}>
      <span aria-hidden="true">+</span>
      {action.label}
    </button>
  )
}

function usePagedData<T>(loader: () => Promise<PagedResult<T>>, deps: unknown[]) {
  const [data, setData] = useState<PagedResult<T>>(blankPage<T>())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    loader()
      .then((result) => {
        if (active) setData(pagedFrom<T>(result))
      })
      .catch((err: Error) => {
        if (active) {
          setData(blankPage<T>())
          setError(err.message)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, deps)

  return { data, loading, error }
}

type ReferenceKind = 'trainees' | 'courses' | 'instructors' | 'batches'

const allReferenceKinds: ReferenceKind[] = ['trainees', 'courses', 'instructors', 'batches']

function useReferenceData(refreshToken: number | string, enabled = true, kinds: ReferenceKind[] = allReferenceKinds) {
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const kindsKey = kinds.join('|')

  useEffect(() => {
    if (!enabled) {
      setTrainees([])
      setCourses([])
      setInstructors([])
      setBatches([])
      setLoading(false)
      setError('')
      return
    }

    let active = true
    const shouldLoad = (kind: ReferenceKind) => kinds.includes(kind)

    setLoading(true)
    setError('')
    Promise.allSettled([
      shouldLoad('trainees') ? api.trainees.list({ page: 1, pageSize: 100 }) : Promise.resolve(undefined),
      shouldLoad('courses') ? api.courses.list({ page: 1, pageSize: 100 }) : Promise.resolve(undefined),
      shouldLoad('instructors') ? api.instructors.list({ page: 1, pageSize: 100 }) : Promise.resolve(undefined),
      shouldLoad('batches') ? api.batches.list({ page: 1, pageSize: 100 }) : Promise.resolve(undefined),
    ]).then(([traineeResult, courseResult, instructorResult, batchResult]) => {
      if (!active) return
      setTrainees(traineeResult.status === 'fulfilled' ? normalizeTrainees(traineeResult.value) : [])
      setCourses(courseResult.status === 'fulfilled' ? arrayFrom<Course>(courseResult.value) : [])
      setInstructors(instructorResult.status === 'fulfilled' ? arrayFrom<Instructor>(instructorResult.value) : [])
      setBatches(batchResult.status === 'fulfilled' ? arrayFrom<Batch>(batchResult.value) : [])
      setError(
        [traineeResult, courseResult, instructorResult, batchResult]
          .filter((result) => result.status === 'rejected')
          .map((result) => (result as PromiseRejectedResult).reason?.message ?? 'Failed to load reference data')
          .join(' '),
      )
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [refreshToken, enabled, kindsKey])

  return { trainees, courses, instructors, batches, loading, error }
}

function DashboardPage({ onOpen, refreshToken }: { onOpen: (route: RouteKey) => void; refreshToken: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState({
    totalTrainees: 0,
    activeBatches: 0,
    todaysClasses: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    attendanceRate: 0,
  })
  const [classes, setClasses] = useState<TodaysClass[]>([])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.allSettled([
      api.dashboard.summary(),
      api.dashboard.totalTrainees(),
      api.dashboard.activeBatches(),
      api.dashboard.todaysClasses(),
      api.dashboard.attendanceSummary(today()),
    ])
      .then(([summary, total, activeBatches, todaysClasses, attendance]) => {
        if (!active) return
        const summaryValue = summary.status === 'fulfilled' ? summary.value : {}
        const attendanceValue =
          attendance.status === 'fulfilled'
            ? attendance.value
            : { presentCount: 0, absentCount: 0, lateCount: 0, attendanceRate: 0 }
        const todaysClassItems =
          todaysClasses.status === 'fulfilled' ? arrayFrom<TodaysClass>(todaysClasses.value) : []
        setMetrics({
          totalTrainees:
            total.status === 'fulfilled' ? numberFrom(total.value) : numberFrom(summaryValue.totalTrainees),
          activeBatches:
            activeBatches.status === 'fulfilled'
              ? numberFrom(activeBatches.value)
              : numberFrom(summaryValue.activeBatches),
          todaysClasses:
            todaysClasses.status === 'fulfilled'
              ? todaysClassItems.length
              : numberFrom(summaryValue.todaysClasses),
          presentCount: numberFrom(attendanceValue.presentCount ?? summaryValue.presentCount),
          absentCount: numberFrom(attendanceValue.absentCount ?? summaryValue.absentCount),
          lateCount: numberFrom(attendanceValue.lateCount ?? summaryValue.lateCount),
          attendanceRate: numberFrom(attendanceValue.attendanceRate ?? summaryValue.attendanceRate),
        })
        setClasses(todaysClassItems)
        const failed = [summary, total, activeBatches, todaysClasses, attendance].find(
          (result) => result.status === 'rejected',
        )
        setError(failed?.status === 'rejected' ? failed.reason.message : '')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [refreshToken])

  return (
    <section className="page-stack">
      {error && <Alert tone="warning" message={error} />}
      <div className="metric-grid">
        <Metric title="Total trainees" value={metrics.totalTrainees} hint="Registered learners" loading={loading} />
        <Metric title="Active batches" value={metrics.activeBatches} hint="Currently running" loading={loading} />
        <Metric title="Today's classes" value={metrics.todaysClasses} hint={formatDate(today())} loading={loading} />
        <Metric
          title="Attendance"
          value={`${Math.round(metrics.attendanceRate || 0)}%`}
          hint={`${metrics.presentCount} present, ${metrics.absentCount} absent, ${metrics.lateCount} late`}
          loading={loading}
        />
      </div>
      <section className="panel">
        <PanelHeader title="Today's class schedule" actionLabel="Open schedules" onAction={() => onOpen('schedules')} />
        <DataTable
          loading={loading}
          emptyText="No classes scheduled for today."
          columns={['Batch', 'Course', 'Instructor', 'Time', 'Room']}
          rows={classes.map((item) => [
            item.batchCode,
            item.courseName ?? '-',
            item.instructorName ?? '-',
            `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`,
            item.room,
          ])}
        />
      </section>
    </section>
  )
}

function Metric({
  title,
  value,
  hint,
  loading,
}: {
  title: string
  value: string | number
  hint: string
  loading: boolean
}) {
  return (
    <article className="metric-card">
      <span>{title}</span>
      <strong>{loading ? '...' : value}</strong>
      <small>{hint}</small>
    </article>
  )
}

function TraineesPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error } = usePagedData(
    () => api.trainees.list({ search, status, page, pageSize: 20 }),
    [search, status, page, refreshToken],
  )

  const remove = async (id: number) => {
    if (!window.confirm('Delete this trainee?')) return
    await api.trainees.delete(id)
    setPage(1)
  }

  return (
    <section className="panel">
      <ListToolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} />
      {error && <Alert tone="error" message={error} />}
      <DataTable
        loading={loading}
        emptyText="No trainees match the current filters."
        columns={['Name', 'Phone', 'National ID', 'Registered', 'Status', 'Actions']}
        rows={data.items.map((item) => [
          <strong>{personName(item)}</strong>,
          item.phone,
          item.nationalId ?? '-',
          formatDate(item.registrationDate),
          <StatusBadge value={item.status} />,
          <RowActions
            actions={[
              { label: 'Edit', onClick: () => onModal({ type: 'trainee', item }) },
              { label: 'Attendance', onClick: () => onModal({ type: 'traineeHistory', item, tab: 'attendance' }) },
              { label: 'Certificates', onClick: () => onModal({ type: 'traineeHistory', item, tab: 'certificates' }) },
              { label: 'Delete', danger: true, onClick: () => void remove(item.id) },
            ]}
          />,
        ])}
      />
      <Pagination data={data} onPage={setPage} />
    </section>
  )
}

function CoursesPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error } = usePagedData(
    () => api.courses.list({ search, status, page, pageSize: 20 }),
    [search, status, page, refreshToken],
  )
  const remove = async (id: number) => {
    if (!window.confirm('Delete this course?')) return
    await api.courses.delete(id)
    setPage(1)
  }

  return (
    <section className="panel">
      <ListToolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} />
      {error && <Alert tone="error" message={error} />}
      <DataTable
        loading={loading}
        emptyText="No courses match the current filters."
        columns={['Course', 'Description', 'Duration', 'Status', 'Actions']}
        rows={data.items.map((item) => [
          <strong>{item.name}</strong>,
          item.description || '-',
          `${item.durationHours} hours`,
          <StatusBadge value={item.status} />,
          <RowActions
            actions={[
              { label: 'Edit', onClick: () => onModal({ type: 'course', item }) },
              { label: 'Delete', danger: true, onClick: () => void remove(item.id) },
            ]}
          />,
        ])}
      />
      <Pagination data={data} onPage={setPage} />
    </section>
  )
}

function InstructorsPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error } = usePagedData(
    () => api.instructors.list({ search, status, page, pageSize: 20 }),
    [search, status, page, refreshToken],
  )
  const remove = async (id: number) => {
    if (!window.confirm('Delete this instructor?')) return
    await api.instructors.delete(id)
    setPage(1)
  }

  return (
    <section className="panel">
      <ListToolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} />
      {error && <Alert tone="error" message={error} />}
      <DataTable
        loading={loading}
        emptyText="No instructors match the current filters."
        columns={['Name', 'Phone', 'Email', 'Status', 'Actions']}
        rows={data.items.map((item) => [
          <strong>{personName(item)}</strong>,
          item.phone,
          item.email ?? '-',
          <StatusBadge value={item.status} />,
          <RowActions
            actions={[
              { label: 'Edit', onClick: () => onModal({ type: 'instructor', item }) },
              { label: 'Delete', danger: true, onClick: () => void remove(item.id) },
            ]}
          />,
        ])}
      />
      <Pagination data={data} onPage={setPage} />
    </section>
  )
}

function BatchesPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
  const refs = useReferenceData(refreshToken)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [courseId, setCourseId] = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error } = usePagedData(
    () => api.batches.list({ search, status, courseId, instructorId, page, pageSize: 20 }),
    [search, status, courseId, instructorId, page, refreshToken],
  )
  const remove = async (id: number) => {
    if (!window.confirm('Delete this batch?')) return
    await api.batches.delete(id)
    setPage(1)
  }

  return (
    <section className="panel">
      <ListToolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} statuses={batchStatuses}>
        <Select value={courseId} onChange={setCourseId} label="Course" options={refs.courses.map(optionFromName)} />
        <Select
          value={instructorId}
          onChange={setInstructorId}
          label="Instructor"
          options={refs.instructors.map(optionFromPersonName)}
        />
      </ListToolbar>
      {error && <Alert tone="error" message={error} />}
      <DataTable
        loading={loading}
        emptyText="No batches match the current filters."
        columns={['Batch', 'Course', 'Instructor', 'Dates', 'Capacity', 'Enrolled', 'Status', 'Actions']}
        rows={data.items.map((item) => [
          <strong>{item.code}</strong>,
          item.courseName,
          item.instructorName,
          `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`,
          item.capacity,
          item.enrolledCount,
          <StatusBadge value={item.status} />,
          <RowActions
            actions={[
              { label: 'Manage', onClick: () => onModal({ type: 'batchTrainees', item }) },
              { label: 'Edit', onClick: () => onModal({ type: 'batch', item }) },
              { label: 'Delete', danger: true, onClick: () => void remove(item.id) },
            ]}
          />,
        ])}
      />
      <Pagination data={data} onPage={setPage} />
    </section>
  )
}

function SchedulesPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
  const refs = useReferenceData(refreshToken)
  const [search, setSearch] = useState('')
  const [batchId, setBatchId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error } = usePagedData(
    () => api.schedules.list({ search, batchId, dayOfWeek, page, pageSize: 20 }),
    [search, batchId, dayOfWeek, page, refreshToken],
  )
  const remove = async (id: number) => {
    if (!window.confirm('Delete this schedule?')) return
    await api.schedules.delete(id)
    setPage(1)
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} />
        <Select value={batchId} onChange={setBatchId} label="Batch" options={refs.batches.map(optionFromCode)} />
        <Select
          value={dayOfWeek}
          onChange={setDayOfWeek}
          label="Day"
          options={daysOfWeek.map((day) => ({ value: day, label: day }))}
        />
      </div>
      {error && <Alert tone="error" message={error} />}
      <DataTable
        loading={loading}
        emptyText="No schedules match the current filters."
        columns={['Batch', 'Day', 'Start', 'End', 'Room', 'Actions']}
        rows={data.items.map((item) => [
          <strong>{item.batchCode}</strong>,
          item.dayOfWeek,
          formatTime(item.startTime),
          formatTime(item.endTime),
          item.room,
          <RowActions
            actions={[
              { label: 'Edit', onClick: () => onModal({ type: 'schedule', item }) },
              { label: 'Delete', danger: true, onClick: () => void remove(item.id) },
            ]}
          />,
        ])}
      />
      <Pagination data={data} onPage={setPage} />
    </section>
  )
}

function AttendancePage({ refreshToken }: { refreshToken: number }) {
  const refs = useReferenceData(refreshToken)
  const [batchId, setBatchId] = useState('')
  const [date, setDate] = useState(today())
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [records, setRecords] = useState<Record<number, AttendanceStatus>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!batchId) {
      setTrainees([])
      return
    }
    setLoading(true)
    setError('')
    api.batches
      .trainees(Number(batchId))
      .then((items) => {
        const traineeItems = normalizeTrainees(items)
        setTrainees(traineeItems)
        setRecords(Object.fromEntries(traineeItems.map((item) => [item.id, 'Present'])))
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [batchId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!batchId) return
    setMessage('')
    setError('')
    try {
      await api.batches.attendance(
        Number(batchId),
        date,
        trainees.map((trainee) => ({ traineeId: trainee.id, status: records[trainee.id] ?? 'Present' })),
      )
      setMessage('Attendance saved successfully.')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="panel attendance-panel">
      <form onSubmit={submit}>
        <div className="form-grid">
          <Select value={batchId} onChange={setBatchId} label="Batch" options={refs.batches.map(optionFromCode)} />
          <Field label="Attendance date">
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </Field>
        </div>
        {message && <Alert tone="success" message={message} />}
        {error && <Alert tone="error" message={error} />}
        <DataTable
          loading={loading}
          emptyText={batchId ? 'No enrolled trainees found for this batch.' : 'Select a batch to load trainees.'}
          columns={['Trainee', 'Phone', 'Status']}
          rows={trainees.map((trainee) => [
            <strong>{personName(trainee)}</strong>,
            trainee.phone,
            <Segmented
              value={records[trainee.id] ?? 'Present'}
              options={attendanceStatuses}
              onChange={(value) => setRecords((current) => ({ ...current, [trainee.id]: value as AttendanceStatus }))}
            />,
          ])}
        />
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={!batchId || trainees.length === 0}>
            Submit attendance
          </button>
        </div>
      </form>
    </section>
  )
}

function CertificatesPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
  const refs = useReferenceData(refreshToken)
  const [search, setSearch] = useState('')
  const [traineeId, setTraineeId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error } = usePagedData<Certificate>(
    () => api.certificates.list({ search, traineeId, courseId, batchId, page, pageSize: 20 }).then(certificatePageFrom),
    [search, traineeId, courseId, batchId, page, refreshToken],
  )

  return (
    <section className="panel">
      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} />
        <Select value={traineeId} onChange={setTraineeId} label="Trainee" options={refs.trainees.map(optionFromPersonName)} />
        <Select value={courseId} onChange={setCourseId} label="Course" options={refs.courses.map(optionFromName)} />
        <Select value={batchId} onChange={setBatchId} label="Batch" options={refs.batches.map(optionFromCode)} />
      </div>
      {error && <Alert tone="error" message={error} />}
      <DataTable
        loading={loading}
        emptyText="No certificates match the current filters."
        columns={['Certificate', 'Trainee', 'Course', 'Batch', 'Issued', 'Completed']}
        rows={data.items.map((item) => [
          <strong>{item.certificateNumber || '-'}</strong>,
          item.traineeName || '-',
          item.courseName || '-',
          item.batchCode || '-',
          formatDate(item.issueDate),
          formatDate(item.completionDate),
        ])}
      />
      <Pagination data={data} onPage={setPage} />
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={() => onModal({ type: 'certificate' })}>
          Generate certificate
        </button>
      </div>
    </section>
  )
}

function TenantsPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
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

function UsersPage({
  onModal,
  refreshToken,
  canManage,
}: {
  onModal: (modal: ModalState) => void
  refreshToken: number
  canManage: boolean
}) {
  const { data, loading, error } = usePagedData(
    () => api.users.list().then(usersPageFrom),
    [refreshToken],
  )

  return (
    <section className="panel">
      <PanelHeader
        title="Users"
        actionLabel="New user"
        onAction={() => onModal({ type: 'user' })}
        disabled={!canManage}
      />
      {!canManage && <Alert tone="warning" message="You need Users.Manage permission to create users or change role/status." />}
      {error && <Alert tone="error" message={error} />}
      <DataTable
        loading={loading}
        emptyText="No users found."
        columns={['Name', 'Email', 'Role', 'Tenant', 'Status', 'Actions']}
        rows={data.items.map((item) => [
            <strong>{userDisplayName(item)}</strong>,
            userEmail(item),
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
      <Pagination data={data} onPage={() => undefined} />
    </section>
  )
}

function AppModal({
  modal,
  refreshToken,
  onClose,
  onSaved,
}: {
  modal: ModalState
  refreshToken: number
  onClose: () => void
  onSaved: () => void
}) {
  if (!modal) return null

  return <ModalContent modal={modal} refreshToken={refreshToken} onClose={onClose} onSaved={onSaved} />
}

function ModalContent({
  modal,
  refreshToken,
  onClose,
  onSaved,
}: {
  modal: Exclude<ModalState, null>
  refreshToken: number
  onClose: () => void
  onSaved: () => void
}) {
  const refs = useReferenceData(`${refreshToken}:${modal.type}`, true, referenceKindsForModal(modal))
  const [error, setError] = useState('')

  useEffect(() => setError(''), [modal])

  const saveAndClose = () => {
    onSaved()
    onClose()
  }

  const run = async (work: () => Promise<unknown>) => {
    setError('')
    try {
      await work()
      saveAndClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Operations record</p>
            <h2>{modalTitle(modal)}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {error && <Alert tone="error" message={error} />}
        {refs.error && <Alert tone="error" message={refs.error} />}
        {refs.loading && <div className="state-box">Loading form options...</div>}
        {modal.type === 'trainee' && (
          <TraineeForm item={modal.item} onSubmit={(body) => run(() => modal.item ? api.trainees.update(modal.item.id, body) : api.trainees.create(body))} />
        )}
        {modal.type === 'course' && (
          <CourseForm item={modal.item} onSubmit={(body) => run(() => modal.item ? api.courses.update(modal.item.id, body) : api.courses.create(body))} />
        )}
        {modal.type === 'instructor' && (
          <InstructorForm
            item={modal.item}
            onSubmit={(body) => run(() => modal.item ? api.instructors.update(modal.item.id, body) : api.instructors.create(body))}
          />
        )}
        {modal.type === 'batch' && (
          <BatchForm
            item={modal.item}
            courses={refs.courses}
            instructors={refs.instructors}
            onSubmit={(body) => run(() => modal.item ? api.batches.update(modal.item.id, body) : api.batches.create(body))}
          />
        )}
        {modal.type === 'schedule' && (
          <ScheduleForm
            item={modal.item}
            batches={refs.batches}
            onSubmit={(body) => run(() => modal.item ? api.schedules.update(modal.item.id, body) : api.schedules.create(body))}
          />
        )}
        {modal.type === 'certificate' && (
          <CertificateForm
            trainees={refs.trainees}
            courses={refs.courses}
            batches={refs.batches}
            onSubmit={(body) => run(() => api.certificates.create(body))}
          />
        )}
        {modal.type === 'user' && (
          <UserForm
            item={modal.item}
            onSubmit={(body) =>
              run(() => modal.item ? api.users.update(userId(modal.item), body as UpdateUserRequest) : api.users.create(body as CreateUserRequest))
            }
          />
        )}
        {modal.type === 'tenant' && (
          <TenantForm
            item={modal.item}
            onSubmit={(body) => run(() => modal.item ? api.tenants.update(tenantIdValue(modal.item), body) : api.tenants.create(body))}
          />
        )}
        {modal.type === 'batchTrainees' && <BatchTraineesManager batch={modal.item} allTrainees={refs.trainees} />}
        {modal.type === 'traineeHistory' && <TraineeHistory trainee={modal.item} tab={modal.tab} />}
      </section>
    </div>
  )
}

function modalTitle(modal: Exclude<ModalState, null>) {
  if (modal.type === 'batchTrainees') return `Manage ${modal.item.code}`
  if (modal.type === 'traineeHistory') return `${personName(modal.item)} history`
  if (modal.type === 'certificate') return 'Generate certificate'
  if (modal.type === 'user') return modal.item ? 'Edit user' : 'Create user'
  if (modal.type === 'tenant') return `${modal.item ? 'Edit' : 'Create'} tenant`
  return `${modal.item ? 'Edit' : 'Create'} ${modal.type}`
}

function referenceKindsForModal(modal: ModalState): ReferenceKind[] {
  if (!modal) return []
  if (modal.type === 'batch') return ['courses', 'instructors']
  if (modal.type === 'schedule') return ['batches']
  if (modal.type === 'certificate') return ['trainees', 'courses', 'batches']
  if (modal.type === 'batchTrainees') return ['trainees']
  return []
}

function TraineeForm({ item, onSubmit }: { item?: Trainee; onSubmit: (body: Partial<Trainee>) => void }) {
  return (
    <RecordForm
      submitLabel={item ? 'Save trainee' : 'Create trainee'}
      onSubmit={(data) =>
        onSubmit({
          FirstName: String(data.get('FirstName')),
          LastName: String(data.get('LastName')),
          phone: String(data.get('phone')),
          email: nullable(data.get('email')),
          nationalId: nullable(data.get('nationalId')),
          registrationDate: String(data.get('registrationDate')),
          status: String(data.get('status')) as EntityStatus,
        })
      }
    >
      <TextField name="FirstName" label="First name" defaultValue={item ? firstName(item) : ''} required />
      <TextField name="LastName" label="Last name" defaultValue={item ? lastName(item) : ''} required />
      <TextField name="phone" label="Phone" defaultValue={item?.phone} required />
      <TextField name="email" label="Email" type="email" defaultValue={item?.email ?? ''} />
      <TextField name="nationalId" label="National ID" defaultValue={item?.nationalId ?? ''} />
      <TextField name="registrationDate" label="Registration date" type="date" defaultValue={dateValue(item?.registrationDate) || today()} required />
      <SelectField name="status" label="Status" defaultValue={item?.status ?? 'Active'} options={entityStatuses} />
    </RecordForm>
  )
}

function CourseForm({ item, onSubmit }: { item?: Course; onSubmit: (body: Partial<Course>) => void }) {
  return (
    <RecordForm
      submitLabel={item ? 'Save course' : 'Create course'}
      onSubmit={(data) =>
        onSubmit({
          name: String(data.get('name')),
          description: String(data.get('description')),
          durationHours: Number(data.get('durationHours')),
          status: String(data.get('status')) as EntityStatus,
        })
      }
    >
      <TextField name="name" label="Course name" defaultValue={item?.name} required />
      <TextField name="description" label="Description" defaultValue={item?.description} />
      <TextField name="durationHours" label="Duration hours" type="number" defaultValue={item?.durationHours ?? 24} required />
      <SelectField name="status" label="Status" defaultValue={item?.status ?? 'Active'} options={entityStatuses} />
    </RecordForm>
  )
}

function InstructorForm({ item, onSubmit }: { item?: Instructor; onSubmit: (body: Partial<Instructor>) => void }) {
  return (
    <RecordForm
      submitLabel={item ? 'Save instructor' : 'Create instructor'}
      onSubmit={(data) =>
        onSubmit({
          FirstName: String(data.get('FirstName')),
          LastName: String(data.get('LastName')),
          phone: String(data.get('phone')),
          email: nullable(data.get('email')),
          status: String(data.get('status')) as EntityStatus,
        })
      }
    >
      <TextField name="FirstName" label="First name" defaultValue={item ? firstName(item) : ''} required />
      <TextField name="LastName" label="Last name" defaultValue={item ? lastName(item) : ''} required />
      <TextField name="phone" label="Phone" defaultValue={item?.phone} required />
      <TextField name="email" label="Email" type="email" defaultValue={item?.email ?? ''} />
      <SelectField name="status" label="Status" defaultValue={item?.status ?? 'Active'} options={entityStatuses} />
    </RecordForm>
  )
}

function BatchForm({
  item,
  courses,
  instructors,
  onSubmit,
}: {
  item?: Batch
  courses: Course[]
  instructors: Instructor[]
  onSubmit: (body: Partial<Batch>) => void
}) {
  return (
    <RecordForm
      submitLabel={item ? 'Save batch' : 'Create batch'}
      onSubmit={(data) =>
        onSubmit({
          code: String(data.get('code')),
          courseId: Number(data.get('courseId')),
          instructorId: Number(data.get('instructorId')),
          startDate: String(data.get('startDate')),
          endDate: String(data.get('endDate')),
          capacity: Number(data.get('capacity')),
          status: String(data.get('status')) as BatchStatus,
        })
      }
    >
      <TextField name="code" label="Batch code" defaultValue={item?.code} required />
      <SelectField name="courseId" label="Course" defaultValue={item?.courseId} options={courses.map(optionFromName)} />
      <SelectField name="instructorId" label="Instructor" defaultValue={item?.instructorId} options={instructors.map(optionFromPersonName)} />
      <TextField name="startDate" label="Start date" type="date" defaultValue={dateValue(item?.startDate) || today()} required />
      <TextField name="endDate" label="End date" type="date" defaultValue={dateValue(item?.endDate) || today()} required />
      <TextField name="capacity" label="Capacity" type="number" defaultValue={item?.capacity ?? 20} required />
      <SelectField name="status" label="Status" defaultValue={item?.status ?? 'Planned'} options={batchStatuses} />
    </RecordForm>
  )
}

function ScheduleForm({
  item,
  batches,
  onSubmit,
}: {
  item?: Schedule
  batches: Batch[]
  onSubmit: (body: Partial<Schedule>) => void
}) {
  return (
    <RecordForm
      submitLabel={item ? 'Save schedule' : 'Create schedule'}
      onSubmit={(data) =>
        onSubmit({
          batchId: Number(data.get('batchId')),
          dayOfWeek: String(data.get('dayOfWeek')) as DayOfWeek,
          startTime: timeForApi(data.get('startTime')),
          endTime: timeForApi(data.get('endTime')),
          room: String(data.get('room')),
        })
      }
    >
      <SelectField name="batchId" label="Batch" defaultValue={item?.batchId} options={batches.map(optionFromCode)} />
      <SelectField name="dayOfWeek" label="Day of week" defaultValue={item?.dayOfWeek ?? 'Sunday'} options={daysOfWeek} />
      <TextField name="startTime" label="Start time" type="time" defaultValue={timeInputValue(item?.startTime, '09:00')} required />
      <TextField name="endTime" label="End time" type="time" defaultValue={timeInputValue(item?.endTime, '12:00')} required />
      <TextField name="room" label="Room" defaultValue={item?.room} required />
    </RecordForm>
  )
}

function CertificateForm({
  trainees,
  courses,
  batches,
  onSubmit,
}: {
  trainees: Trainee[]
  courses: Course[]
  batches: Batch[]
  onSubmit: (body: Partial<Certificate>) => void
}) {
  return (
    <RecordForm
      submitLabel="Generate certificate"
      onSubmit={(data) =>
        onSubmit({
          certificateNumber: nullable(data.get('certificateNumber')) ?? undefined,
          traineeId: Number(data.get('traineeId')),
          courseId: Number(data.get('courseId')),
          batchId: Number(data.get('batchId')),
          completionDate: String(data.get('completionDate')),
          issueDate: nullable(data.get('issueDate')) ?? undefined,
        })
      }
    >
      <TextField name="certificateNumber" label="Certificate number" />
      <SelectField name="traineeId" label="Trainee" options={trainees.map(optionFromPersonName)} />
      <SelectField name="courseId" label="Course" options={courses.map(optionFromName)} />
      <SelectField name="batchId" label="Batch" options={batches.map(optionFromCode)} />
      <TextField name="completionDate" label="Completion date" type="date" defaultValue={today()} required />
      <TextField name="issueDate" label="Issue date" type="date" />
    </RecordForm>
  )
}

function TenantForm({ item, onSubmit }: { item?: Tenant; onSubmit: (body: { name: string; slug: string }) => void }) {
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

function UserForm({
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

function BatchTraineesManager({ batch, allTrainees }: { batch: Batch; allTrainees: Trainee[] }) {
  const [items, setItems] = useState<Trainee[]>([])
  const [traineeId, setTraineeId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const enrolledTraineeIds = useMemo(() => new Set(items.map((item) => item.id)), [items])
  const available = useMemo(
    () => allTrainees.filter((trainee) => !enrolledTraineeIds.has(trainee.id)),
    [allTrainees, enrolledTraineeIds],
  )

  const load = () => {
    setLoading(true)
    api.batches
      .trainees(batch.id)
      .then((result) => setItems(normalizeTrainees(result)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [batch.id])

  const add = async () => {
    if (!traineeId) return
    setError('')
    try {
      await api.batches.addTrainee(batch.id, Number(traineeId))
      setTraineeId('')
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const remove = async (id: number) => {
    setError('')
    try {
      await api.batches.removeTrainee(batch.id, id)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="page-stack">
      {error && <Alert tone="error" message={error} />}
      <div className="inline-controls">
        <Select value={traineeId} onChange={setTraineeId} label="Add trainee" options={available.map(optionFromPersonName)} />
        <button className="primary-button" type="button" onClick={add} disabled={!traineeId}>
          Add
        </button>
      </div>
      <DataTable
        loading={loading}
        emptyText="No trainees are enrolled in this batch."
        columns={['Name', 'Phone', 'Status', 'Actions']}
        rows={items.map((item) => [
          <strong>{personName(item)}</strong>,
          item.phone,
          <StatusBadge value={item.status} />,
          <button className="danger-button" type="button" onClick={() => void remove(item.id)}>
            Remove
          </button>,
        ])}
      />
    </div>
  )
}

function TraineeHistory({ trainee, tab }: { trainee: Trainee; tab: 'attendance' | 'certificates' }) {
  const [attendance, setAttendance] = useState<PagedResult<AttendanceRecord>>(blankPage())
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([api.trainees.attendance(trainee.id, { page: 1, pageSize: 20 }), api.trainees.certificates(trainee.id)])
      .then(([attendanceResult, certificateResult]) => {
        setAttendance(pagedFrom<AttendanceRecord>(attendanceResult))
        setCertificates(normalizeCertificates(certificateResult))
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [trainee.id])

  return (
    <div className="page-stack">
      {error && <Alert tone="error" message={error} />}
      {tab === 'attendance' ? (
        <DataTable
          loading={loading}
          emptyText="No attendance records found."
          columns={['Batch', 'Date', 'Status']}
          rows={attendance.items.map((item) => [item.batchCode, formatDate(item.date), <StatusBadge value={item.status} />])}
        />
      ) : (
        <DataTable
          loading={loading}
          emptyText="No certificates found."
          columns={['Certificate', 'Course', 'Batch', 'Issued']}
          rows={certificates.map((item) => [item.certificateNumber || '-', item.courseName || '-', item.batchCode || '-', formatDate(item.issueDate)])}
        />
      )}
    </div>
  )
}

function ListToolbar({
  search,
  onSearch,
  status,
  onStatus,
  statuses = entityStatuses,
  children,
}: {
  search: string
  onSearch: (value: string) => void
  status: string
  onStatus: (value: string) => void
  statuses?: string[]
  children?: React.ReactNode
}) {
  return (
    <div className="toolbar">
      <SearchInput value={search} onChange={onSearch} />
      <Select value={status} onChange={onStatus} label="Status" options={statuses.map((item) => ({ value: item, label: item }))} />
      {children}
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="control search-control">
      <span>Search</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search records" />
    </label>
  )
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string | number
  onChange: (value: string) => void
  label: string
  options: { value: string | number; label: string }[]
}) {
  return (
    <label className="control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="control">
      <span>{label}</span>
      {children}
    </label>
  )
}

function TextField({
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

function SelectField({
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

function RecordForm({
  children,
  submitLabel,
  onSubmit,
}: {
  children: React.ReactNode
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

function DataTable({
  columns,
  rows,
  loading,
  emptyText,
}: {
  columns: string[]
  rows: React.ReactNode[][]
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

function StatusBadge({ value }: { value?: string | null }) {
  const label = value || 'Unknown'
  return <span className={`status-badge status-${label.toLowerCase()}`}>{label}</span>
}

function RowActions({
  actions,
}: {
  actions: { label: string; onClick: () => void; danger?: boolean }[]
}) {
  return (
    <div className="row-actions">
      {actions.map((action) => (
        <button
          key={action.label}
          className={action.danger ? 'danger-button' : 'ghost-button'}
          type="button"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

function Pagination<T>({ data, onPage }: { data: PagedResult<T>; onPage: (page: number) => void }) {
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

function PanelHeader({
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

function Alert({ tone, message }: { tone: 'error' | 'success' | 'warning'; message: string }) {
  return <div className={`alert ${tone}`}>{message}</div>
}

function AccessDenied() {
  return (
    <section className="panel">
      <Alert tone="warning" message="You do not have access to this area." />
    </section>
  )
}

function Segmented({
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

function optionFromName(item: Course) {
  return { value: item.id, label: item.name ?? item.Name ?? '-' }
}

function optionFromPersonName(item: Trainee | Instructor) {
  return { value: item.id, label: personName(item) }
}

function personName(item: Trainee | Instructor) {
  const record = recordFrom(item)
  return (
    stringField(record, 'fullName', 'FullName', 'traineeName', 'TraineeName', 'instructorName', 'InstructorName') ||
    [firstName(item), lastName(item)].filter(Boolean).join(' ') ||
    '-'
  )
}

function firstName(item: Trainee | Instructor) {
  return item.FisrtName ?? item.fisrtName ?? item.FirstName ?? item.firstName ?? ''
}

function lastName(item: Trainee | Instructor) {
  return item.LastName ?? item.lastName ?? ''
}

function optionFromCode(item: Batch) {
  return { value: item.id, label: item.code }
}

function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function dateValue(value?: string) {
  return value ? value.slice(0, 10) : ''
}

export default App
