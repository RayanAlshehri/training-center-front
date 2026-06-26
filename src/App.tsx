import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { api } from './services/api'
import {
  attendanceStatuses,
  batchStatuses,
  certificateStatuses,
  classSessionStatuses,
  daysOfWeek,
  deliveryModes,
  entityStatuses,
  scheduleStatuses,
  type AttendanceRecord,
  type AttendanceStatus,
  type Batch,
  type BatchStatus,
  type BatchStatusCounts,
  type Certificate,
  type CertificateSettings,
  type CertificateStatus,
  type ClassSession,
  type ClassSessionStatus,
  type CreateClassSessionRequest,
  type CreateUserRequest,
  type Course,
  type DayOfWeek,
  type DeliveryMode,
  type EntityStatus,
  type GenerateCertificateRequest,
  type Instructor,
  type PagedResult,
  type Schedule,
  type ScheduleStatus,
  type Tenant,
  type TodaysClass,
  type Trainee,
  type VerifyCertificateResult,
  type UpdateClassSessionRequest,
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
  | 'class-sessions'
  | 'attendance'
  | 'certificates'
  | 'certificate-settings'
  | 'users'
  | 'platform-tenants'

type ModalState =
  | { type: 'trainee'; item?: Trainee }
  | { type: 'traineeProfile'; item: Trainee }
  | { type: 'course'; item?: Course }
  | { type: 'courseDetails'; item: Course }
  | { type: 'instructor'; item?: Instructor }
  | { type: 'batch'; item?: Batch }
  | { type: 'schedule'; item?: Schedule }
  | { type: 'classSession'; item?: ClassSession; schedule?: Schedule }
  | { type: 'revokeCertificate'; item: Certificate }
  | { type: 'user'; item?: UserAccount }
  | { type: 'tenant'; item?: Tenant }
  | { type: 'batchTrainees'; item: Batch }
  | { type: 'traineeHistory'; item: Trainee; tab: 'attendance' | 'certificates' }
  | null

type TraineeSearchField = 'fullName' | 'phone' | 'nationalId'
type CourseSearchField = 'code' | 'name'
type InstructorSearchField = 'fullName' | 'phone'
type UserSearchField = 'fullName' | 'email' | 'phone'

const traineeSearchFields: { value: TraineeSearchField; label: string }[] = [
  { value: 'fullName', label: 'Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'nationalId', label: 'National ID' },
]

const courseSearchFields: { value: CourseSearchField; label: string }[] = [
  { value: 'code', label: 'Code' },
  { value: 'name', label: 'Name' },
]

const instructorSearchFields: { value: InstructorSearchField; label: string }[] = [
  { value: 'fullName', label: 'Name' },
  { value: 'phone', label: 'Phone' },
]

const userSearchFields: { value: UserSearchField; label: string }[] = [
  { value: 'fullName', label: 'Full name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
]

const navItems: { key: RouteKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '▦' },
  { key: 'trainees', label: 'Trainees', icon: '◉' },
  { key: 'courses', label: 'Courses', icon: '□' },
  { key: 'instructors', label: 'Instructors', icon: '◇' },
  { key: 'batches', label: 'Batches', icon: '▤' },
  { key: 'schedules', label: 'Schedules', icon: '◷' },
  { key: 'class-sessions', label: 'Class Sessions', icon: 'CS' },
  { key: 'attendance', label: 'Attendance', icon: '✓' },
  { key: 'certificates', label: 'Certificates', icon: '✦' },
  { key: 'certificate-settings', label: 'Certificate Settings', icon: '⚙' },
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
  'class-sessions': 'Class Sessions',
  attendance: 'Attendance',
  certificates: 'Certificates',
  'certificate-settings': 'Certificate Settings',
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

function normalizeCourse(value: unknown): Course | null {
  const record = recordFrom(value)
  const id = numberField(record, 'id', 'Id', 'courseId', 'CourseId')

  if (!id) return null

  return {
    ...(record as Partial<Course>),
    id,
    code: stringField(record, 'code', 'Code'),
    name: stringField(record, 'name', 'Name', 'courseName', 'CourseName'),
    description: stringField(record, 'description', 'Description'),
    durationHours: numberField(record, 'durationHours', 'DurationHours'),
    status: (stringField(record, 'status', 'Status') || undefined) as Course['status'],
    activeBatchesCount: numberFrom(record.activeBatchesCount ?? record.ActiveBatchesCount),
  } as Course
}

function normalizeCourses(value: unknown) {
  return arrayFrom<unknown>(value).map(normalizeCourse).filter((item): item is Course => item !== null)
}

function normalizeBatch(value: unknown): Batch | null {
  const record = recordFrom(value)
  const id = numberField(record, 'id', 'Id', 'batchId', 'BatchId')

  if (!id) return null

  return {
    ...(record as Partial<Batch>),
    id,
    code: stringField(record, 'code', 'Code', 'batchCode', 'BatchCode'),
    courseId: numberField(record, 'courseId', 'CourseId'),
    courseName: stringField(record, 'courseName', 'CourseName'),
    instructorId: numberField(record, 'instructorId', 'InstructorId'),
    instructorName: stringField(record, 'instructorName', 'InstructorName'),
    startDate: stringField(record, 'startDate', 'StartDate'),
    endDate: stringField(record, 'endDate', 'EndDate'),
    capacity: numberField(record, 'capacity', 'Capacity'),
    status: (stringField(record, 'status', 'Status') || undefined) as Batch['status'],
    enrolledCount: numberFrom(record.enrolledCount ?? record.EnrolledCount),
  } as Batch
}

function normalizeBatches(value: unknown) {
  return arrayFrom<unknown>(value).map(normalizeBatch).filter((item): item is Batch => item !== null)
}

function normalizeSchedule(value: unknown): Schedule | null {
  const record = recordFrom(value)
  const scheduleId = numberField(record, 'scheduleId', 'ScheduleId', 'id', 'Id')

  if (!scheduleId) return null

  return {
    ...(record as Partial<Schedule>),
    id: scheduleId,
    scheduleId,
    batchId: numberField(record, 'batchId', 'BatchId'),
    batchCode: stringField(record, 'batchCode', 'BatchCode'),
    courseName: stringField(record, 'courseName', 'CourseName'),
    instructorId: numberField(record, 'instructorId', 'InstructorId'),
    instructorName: stringField(record, 'instructorName', 'InstructorName'),
    dayOfWeek: (stringField(record, 'dayOfWeek', 'DayOfWeek') || undefined) as Schedule['dayOfWeek'],
    startTime: stringField(record, 'startTime', 'StartTime'),
    endTime: stringField(record, 'endTime', 'EndTime'),
    room: stringField(record, 'room', 'Room') || null,
    deliveryMode: (stringField(record, 'deliveryMode', 'DeliveryMode') || 'InPerson') as DeliveryMode,
    status: (stringField(record, 'status', 'Status') || 'Active') as ScheduleStatus,
    notes: stringField(record, 'notes', 'Notes') || null,
  } as Schedule
}

function schedulePageFrom(value: unknown): PagedResult<Schedule> {
  const page = pagedFrom<unknown>(value)
  return {
    ...page,
    items: page.items.map(normalizeSchedule).filter((item): item is Schedule => item !== null),
  }
}

function scheduleIdValue(item: Schedule) {
  return item.scheduleId || item.id || 0
}

function scheduleWithBatchDetails(item: Schedule, batches: Batch[]) {
  const batch = batches.find((candidate) => candidate.id === item.batchId)
  return {
    ...item,
    batchCode: item.batchCode || batch?.code || '-',
    courseName: item.courseName || batch?.courseName || '-',
    instructorName: item.instructorName || batch?.instructorName || '-',
  }
}

function normalizeClassSession(value: unknown): ClassSession | null {
  const record = recordFrom(value)
  const classSessionId = numberField(record, 'classSessionId', 'ClassSessionId', 'id', 'Id')

  if (!classSessionId) return null

  return {
    ...(record as Partial<ClassSession>),
    id: classSessionId,
    classSessionId,
    scheduleId: numberField(record, 'scheduleId', 'ScheduleId'),
    batchId: numberField(record, 'batchId', 'BatchId'),
    batchCode: stringField(record, 'batchCode', 'BatchCode'),
    courseName: stringField(record, 'courseName', 'CourseName'),
    instructorName: stringField(record, 'instructorName', 'InstructorName'),
    sessionDate: stringField(record, 'sessionDate', 'SessionDate', 'date', 'Date'),
    startTime: stringField(record, 'startTime', 'StartTime'),
    endTime: stringField(record, 'endTime', 'EndTime'),
    room: stringField(record, 'room', 'Room') || null,
    deliveryMode: (stringField(record, 'deliveryMode', 'DeliveryMode') || 'InPerson') as DeliveryMode,
    status: (stringField(record, 'status', 'Status') || 'Scheduled') as ClassSessionStatus,
    notes: stringField(record, 'notes', 'Notes') || null,
  } as ClassSession
}

function classSessionPageFrom(value: unknown): PagedResult<ClassSession> {
  const page = pagedFrom<unknown>(value)
  return {
    ...page,
    items: page.items.map(normalizeClassSession).filter((item): item is ClassSession => item !== null),
  }
}

function classSessionIdValue(item: ClassSession | TodaysClass) {
  return numberField(recordFrom(item), 'classSessionId', 'ClassSessionId', 'id', 'Id')
}

function normalizeTodaysClass(value: unknown): TodaysClass {
  const record = recordFrom(value)
  return {
    ...(record as Partial<TodaysClass>),
    id: numberField(record, 'id', 'Id', 'classSessionId', 'ClassSessionId') || undefined,
    classSessionId: numberField(record, 'classSessionId', 'ClassSessionId', 'id', 'Id') || undefined,
    scheduleId: numberField(record, 'scheduleId', 'ScheduleId') || undefined,
    batchId: numberField(record, 'batchId', 'BatchId') || undefined,
    batchCode: stringField(record, 'batchCode', 'BatchCode'),
    courseName: stringField(record, 'courseName', 'CourseName') || undefined,
    instructorName: stringField(record, 'instructorName', 'InstructorName') || undefined,
    startTime: stringField(record, 'startTime', 'StartTime'),
    endTime: stringField(record, 'endTime', 'EndTime'),
    room: stringField(record, 'room', 'Room') || null,
    deliveryMode: (stringField(record, 'deliveryMode', 'DeliveryMode') || undefined) as DeliveryMode | undefined,
    status: (stringField(record, 'status', 'Status') || undefined) as ClassSessionStatus | undefined,
  }
}

function batchStatusCountsFrom(value: unknown): BatchStatusCounts {
  const record = recordFrom(value)
  return {
    planned: numberFrom(record.planned ?? record.Planned),
    active: numberFrom(record.active ?? record.Active),
    completed: numberFrom(record.completed ?? record.Completed),
    cancelled: numberFrom(record.cancelled ?? record.Cancelled),
    total: numberFrom(record.total ?? record.Total),
  }
}

function normalizeCertificate(value: unknown): Certificate | null {
  const record = recordFrom(value)
  const id = numberField(record, 'id', 'Id')

  if (!id) return null

  return {
    ...(record as Partial<Certificate>),
    id,
    certificateNumber: stringField(record, 'certificateNumber', 'CertificateNumber'),
    status: (stringField(record, 'status', 'Status') || 'Issued') as CertificateStatus,
    traineeId: numberField(record, 'traineeId', 'TraineeId'),
    traineeName: stringField(record, 'traineeName', 'TraineeName'),
    courseId: numberField(record, 'courseId', 'CourseId'),
    courseName: stringField(record, 'courseName', 'CourseName'),
    batchId: numberField(record, 'batchId', 'BatchId'),
    batchCode: stringField(record, 'batchCode', 'BatchCode'),
    trainingHours: numberField(record, 'trainingHours', 'TrainingHours') || undefined,
    issueDate: stringField(record, 'issueDate', 'IssueDate'),
    completionDate: stringField(record, 'completionDate', 'CompletionDate'),
    issuedBy: stringField(record, 'issuedBy', 'IssuedBy') || null,
    verificationToken: stringField(record, 'verificationToken', 'VerificationToken') || null,
    verificationUrl: stringField(record, 'verificationUrl', 'VerificationUrl') || null,
    qrCodeUrl: stringField(record, 'qrCodeUrl', 'QrCodeUrl', 'QRCodeUrl') || null,
    revokedAt: stringField(record, 'revokedAt', 'RevokedAt') || null,
    revokedBy: stringField(record, 'revokedBy', 'RevokedBy') || null,
    revocationReason: stringField(record, 'revocationReason', 'RevocationReason') || null,
    pdfUrl: stringField(record, 'pdfUrl', 'PdfUrl', 'PDFUrl') || null,
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

function userPhone(user: UserAccount) {
  return stringField(recordFrom(user), 'phone', 'Phone') || '-'
}

function userPhoneValue(user?: UserAccount) {
  return user ? stringField(recordFrom(user), 'phone', 'Phone') : ''
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

function coursePageFrom(value: unknown) {
  const page = pagedFrom<Course>(value)
  return {
    ...page,
    items: normalizeCourses(value),
  }
}

function batchPageFrom(value: unknown) {
  const page = pagedFrom<Batch>(value)
  return {
    ...page,
    items: normalizeBatches(value),
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
  if (path === '/certificate-settings') return 'certificate-settings'
  if (path === '/certificates' || path.startsWith('/certificates/')) return 'certificates'
  const segment = path.replace(/^\//, '') as RouteKey
  return navItems.some((item) => item.key === segment) ? segment : 'dashboard'
}

function pathForRoute(route: RouteKey) {
  if (route === 'dashboard') return '/'
  if (route === 'platform-tenants') return '/platform/tenants'
  if (route === 'certificate-settings') return '/certificate-settings'
  return `/${route}`
}

function App() {
  const { isAuthenticated } = useAuth()

  if (window.location.pathname.startsWith('/verify/')) {
    return <PublicVerificationPage token={decodeURIComponent(window.location.pathname.split('/').filter(Boolean)[1] ?? '')} />
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <AdminShell />
}

function AdminShell() {
  const { user, logout, hasPermission, isSuperAdmin, isTenantAdmin, isOperationsStaff, isInstructor, isTenantUser } = useAuth()
  const [route, setRoute] = useState<RouteKey>(routeFromPath)
  const [path, setPath] = useState(window.location.pathname)
  const [modal, setModal] = useState<ModalState>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const canViewUsers = isSuperAdmin || isTenantAdmin || hasPermission('Users.View')
  const canManageUsers = isSuperAdmin || isTenantAdmin || hasPermission('Users.Manage')
  const canManageOperations = isTenantAdmin || isOperationsStaff
  const visibleNavItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (isSuperAdmin) {
          return item.key === 'platform-tenants' || item.key === 'users'
        }

        if (item.key === 'platform-tenants') return false
        if (item.key === 'users') return isTenantAdmin && canViewUsers
        if (item.key === 'certificate-settings') return isTenantAdmin
        if (item.key === 'certificates') return isTenantAdmin || isOperationsStaff
        if (isInstructor) {
          return item.key === 'dashboard' || item.key === 'batches' || item.key === 'schedules' || item.key === 'class-sessions' || item.key === 'attendance'
        }

        return isTenantAdmin || isOperationsStaff || isTenantUser
      }),
    [canViewUsers, isInstructor, isOperationsStaff, isSuperAdmin, isTenantAdmin, isTenantUser],
  )
  const canAccessRoute = visibleNavItems.some((item) => item.key === route)

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname)
      setRoute(routeFromPath())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (next: RouteKey) => {
    const nextPath = pathForRoute(next)
    setRoute(next)
    setPath(nextPath)
    window.history.pushState({}, '', nextPath)
  }

  const navigatePath = (path: string) => {
    window.history.pushState({}, '', path)
    setPath(path)
    setRoute(routeFromPath())
  }

  const openAttendanceForSession = (classSessionId: number) => {
    setRoute('attendance')
    setPath(`/attendance?classSessionId=${classSessionId}`)
    window.history.pushState({}, '', `/attendance?classSessionId=${classSessionId}`)
  }

  useEffect(() => {
    if (canAccessRoute) return
    const nextRoute = visibleNavItems[0]?.key ?? 'dashboard'
    const nextPath = pathForRoute(nextRoute)
    setRoute(nextRoute)
    setPath(nextPath)
    window.history.pushState({}, '', nextPath)
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
            <QuickAction
              route={route}
              onAction={setModal}
              onNavigate={navigatePath}
              canManageUsers={canManageUsers}
              canManageOperations={canManageOperations}
              isSuperAdmin={isSuperAdmin}
              isTenantAdmin={isTenantAdmin}
            />
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
        {canAccessRoute && route === 'dashboard' && (
          <DashboardPage onOpen={navigate} onOpenAttendance={openAttendanceForSession} refreshToken={refreshToken} />
        )}
        {canAccessRoute && route === 'trainees' && <TraineesPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'courses' && <CoursesPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'instructors' && <InstructorsPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'batches' && <BatchesPage onModal={setModal} refreshToken={refreshToken} />}
        {canAccessRoute && route === 'schedules' && (
          <SchedulesPage onModal={setModal} refreshToken={refreshToken} canManage={canManageOperations} />
        )}
        {canAccessRoute && route === 'class-sessions' && (
          <ClassSessionsPage
            onModal={setModal}
            onOpenAttendance={openAttendanceForSession}
            refreshToken={refreshToken}
            canManage={canManageOperations}
          />
        )}
        {canAccessRoute && route === 'attendance' && <AttendancePage refreshToken={refreshToken} />}
        {canAccessRoute && route === 'certificates' && (
          <CertificatesArea
            onNavigate={navigatePath}
            path={path}
            onModal={setModal}
            refreshToken={refreshToken}
            onRefresh={refresh}
          />
        )}
        {canAccessRoute && route === 'certificate-settings' && (
          isTenantAdmin ? <CertificateSettingsPage /> : <AccessDenied />
        )}
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
  onNavigate,
  canManageUsers,
  canManageOperations,
  isSuperAdmin,
  isTenantAdmin,
}: {
  route: RouteKey
  onAction: (modal: ModalState) => void
  onNavigate: (path: string) => void
  canManageUsers: boolean
  canManageOperations: boolean
  isSuperAdmin: boolean
  isTenantAdmin: boolean
}) {
  const config: Partial<Record<RouteKey, { label: string; modal: ModalState }>> = {
    trainees: { label: 'New trainee', modal: { type: 'trainee' } },
    courses: { label: 'New course', modal: { type: 'course' } },
    instructors: { label: 'New instructor', modal: { type: 'instructor' } },
    batches: { label: 'New batch', modal: { type: 'batch' } },
    schedules: { label: 'New schedule', modal: { type: 'schedule' } },
    'class-sessions': { label: 'New class session', modal: { type: 'classSession' } },
    ...(canManageUsers ? { users: { label: 'New user', modal: { type: 'user' } } } : {}),
    ...(isSuperAdmin ? { 'platform-tenants': { label: 'New tenant', modal: { type: 'tenant' } } } : {}),
  }
  if (route === 'certificates' && canManageOperations) {
    return (
      <button className="primary-button" type="button" onClick={() => onNavigate('/certificates/new')}>
        <span aria-hidden="true">+</span>
        Generate certificate
      </button>
    )
  }
  if (route === 'certificate-settings' && isTenantAdmin) {
    return <span className="muted">Today: {formatDate(today())}</span>
  }
  if (!canManageOperations && ['trainees', 'courses', 'instructors', 'batches', 'schedules', 'class-sessions', 'certificates'].includes(route)) {
    return <span className="muted">Today: {formatDate(today())}</span>
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

type ReferenceKind = 'trainees' | 'courses' | 'instructors' | 'batches' | 'schedules'

const allReferenceKinds: ReferenceKind[] = ['trainees', 'courses', 'instructors', 'batches']

function useReferenceData(refreshToken: number | string, enabled = true, kinds: ReferenceKind[] = allReferenceKinds) {
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const kindsKey = kinds.join('|')

  useEffect(() => {
    if (!enabled) {
      setTrainees([])
      setCourses([])
      setInstructors([])
      setBatches([])
      setSchedules([])
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
      shouldLoad('schedules') ? api.schedules.list({ page: 1, pageSize: 100 }) : Promise.resolve(undefined),
    ]).then(([traineeResult, courseResult, instructorResult, batchResult, scheduleResult]) => {
      if (!active) return
      setTrainees(traineeResult.status === 'fulfilled' ? normalizeTrainees(traineeResult.value) : [])
      setCourses(courseResult.status === 'fulfilled' ? normalizeCourses(courseResult.value) : [])
      setInstructors(instructorResult.status === 'fulfilled' ? arrayFrom<Instructor>(instructorResult.value) : [])
      setBatches(batchResult.status === 'fulfilled' ? normalizeBatches(batchResult.value) : [])
      setSchedules(scheduleResult.status === 'fulfilled' ? schedulePageFrom(scheduleResult.value).items : [])
      setError(
        [traineeResult, courseResult, instructorResult, batchResult, scheduleResult]
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

  return { trainees, courses, instructors, batches, schedules, loading, error }
}

function DashboardPage({
  onOpen,
  onOpenAttendance,
  refreshToken,
}: {
  onOpen: (route: RouteKey) => void
  onOpenAttendance: (classSessionId: number) => void
  refreshToken: number
}) {
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
          todaysClasses.status === 'fulfilled'
            ? arrayFrom<unknown>(todaysClasses.value)
                .map(normalizeTodaysClass)
                .filter((item) => item.status !== undefined)
            : []
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
        <PanelHeader title="Today's class sessions" actionLabel="Open class sessions" onAction={() => onOpen('class-sessions')} />
        <DataTable
          loading={loading}
          emptyText="No classes scheduled for today."
          columns={['Batch', 'Course', 'Instructor', 'Start', 'End', 'Room', 'Delivery', 'Status', 'Actions']}
          rows={classes.map((item) => {
            const sessionId = classSessionIdValue(item)
            const isCancelled = item.status === 'Cancelled'
            return [
              item.batchCode,
              item.courseName ?? '-',
              item.instructorName ?? '-',
              formatTime(item.startTime),
              formatTime(item.endTime),
              item.room || '-',
              item.deliveryMode ?? '-',
              <StatusBadge value={item.status} />,
              <RowActions
                actions={[
                  {
                    label: isCancelled ? 'Attendance disabled' : 'Mark attendance',
                    disabled: isCancelled || !sessionId,
                    onClick: () => onOpenAttendance(sessionId),
                  },
                ]}
              />,
            ]
          })}
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
  const [searchField, setSearchField] = useState<TraineeSearchField>('fullName')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [localRefreshToken, setLocalRefreshToken] = useState(0)
  const [updatingTraineeId, setUpdatingTraineeId] = useState<number | null>(null)
  const [loadingEditTraineeId, setLoadingEditTraineeId] = useState<number | null>(null)
  const [loadingProfileTraineeId, setLoadingProfileTraineeId] = useState<number | null>(null)
  const [statusError, setStatusError] = useState('')
  const { data, loading, error } = usePagedData(
    () => api.trainees.list({ search, searchField, status, page, pageSize: 20 }),
    [search, searchField, status, page, refreshToken, localRefreshToken],
  )

  const updateSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const updateSearchField = (value: string) => {
    setSearchField(value as TraineeSearchField)
    setPage(1)
  }

  const updateStatusFilter = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const updateStatus = async (item: Trainee, isActive: boolean) => {
    const action = isActive ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${action} ${personName(item)}?`)) return

    setStatusError('')
    setUpdatingTraineeId(item.id)
    try {
      await api.trainees.setStatus(item.id, isActive)
      setLocalRefreshToken((value) => value + 1)
    } catch (err) {
      setStatusError((err as Error).message)
    } finally {
      setUpdatingTraineeId(null)
    }
  }

  const editTrainee = async (item: Trainee) => {
    if (loadingEditTraineeId || loadingProfileTraineeId) return

    setStatusError('')
    setLoadingEditTraineeId(item.id)
    try {
      const trainee = await api.trainees.get(item.id)
      onModal({ type: 'trainee', item: normalizeTrainee(trainee) ?? trainee })
    } catch (err) {
      setStatusError((err as Error).message)
    } finally {
      setLoadingEditTraineeId(null)
    }
  }

  const viewProfile = async (item: Trainee) => {
    if (loadingEditTraineeId || loadingProfileTraineeId) return

    setStatusError('')
    setLoadingProfileTraineeId(item.id)
    try {
      const trainee = await api.trainees.get(item.id)
      onModal({ type: 'traineeProfile', item: normalizeTrainee(trainee) ?? trainee })
    } catch (err) {
      setStatusError((err as Error).message)
    } finally {
      setLoadingProfileTraineeId(null)
    }
  }

  return (
    <section className="panel">
      <ListToolbar
        search={search}
        onSearch={updateSearch}
        searchPlaceholder={`Search by ${traineeSearchFields.find((item) => item.value === searchField)?.label.toLowerCase()}`}
        status={status}
        onStatus={updateStatusFilter}
        beforeSearch={
          <Select value={searchField} onChange={updateSearchField} label="Search by" options={traineeSearchFields} includeAllOption={false} />
        }
      />
      {error && <Alert tone="error" message={error} />}
      {statusError && <Alert tone="error" message={statusError} />}
      <DataTable
        loading={loading}
        emptyText="No trainees match the current filters."
        columns={['Name', 'Phone', 'National ID', 'Registered', 'Status', 'Actions']}
        rows={data.items.map((item) => [
          <strong>{personName(item)}</strong>,
          item.phone,
          item.nationalId ?? '-',
          formatDate(item.registrationDate),
          <StatusToggle
            checked={item.status !== 'Inactive'}
            disabled={updatingTraineeId === item.id}
            onChange={(checked) => void updateStatus(item, checked)}
          />,
          <RowActions
            actions={[
              { label: loadingProfileTraineeId === item.id ? 'Loading...' : 'Profile', onClick: () => void viewProfile(item) },
              { label: loadingEditTraineeId === item.id ? 'Loading...' : 'Edit', onClick: () => void editTrainee(item) },
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
  const [searchField, setSearchField] = useState<CourseSearchField>('code')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [localRefreshToken, setLocalRefreshToken] = useState(0)
  const [updatingCourseId, setUpdatingCourseId] = useState<number | null>(null)
  const [statusError, setStatusError] = useState('')
  const { data, loading, error } = usePagedData(
    () => api.courses.list({ search, searchField, status, page, pageSize: 20 }).then(coursePageFrom),
    [search, searchField, status, page, refreshToken, localRefreshToken],
  )

  const updateSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const updateSearchField = (value: string) => {
    setSearchField(value as CourseSearchField)
    setPage(1)
  }

  const updateStatusFilter = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const updateStatus = async (item: Course, isActive: boolean) => {
    const action = isActive ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${action} ${item.name}?`)) return

    setStatusError('')
    setUpdatingCourseId(item.id)
    try {
      await api.courses.setStatus(item.id, isActive)
      setLocalRefreshToken((value) => value + 1)
    } catch (err) {
      setStatusError((err as Error).message)
    } finally {
      setUpdatingCourseId(null)
    }
  }

  return (
    <section className="panel">
      <ListToolbar
        search={search}
        onSearch={updateSearch}
        searchPlaceholder={`Search by ${courseSearchFields.find((item) => item.value === searchField)?.label.toLowerCase()}`}
        status={status}
        onStatus={updateStatusFilter}
        beforeSearch={
          <Select value={searchField} onChange={updateSearchField} label="Search by" options={courseSearchFields} includeAllOption={false} />
        }
      />
      {error && <Alert tone="error" message={error} />}
      {statusError && <Alert tone="error" message={statusError} />}
      <DataTable
        loading={loading}
        emptyText="No courses match the current filters."
        columns={['Code', 'Course', 'Description', 'Duration', 'Active Batches', 'Status', 'Actions']}
        rows={data.items.map((item) => [
          <strong>{item.code}</strong>,
          <strong>{item.name}</strong>,
          item.description || '-',
          `${item.durationHours} hours`,
          item.activeBatchesCount,
          <StatusToggle
            checked={item.status !== 'Inactive'}
            disabled={updatingCourseId === item.id}
            onChange={(checked) => void updateStatus(item, checked)}
          />,
          <RowActions
            actions={[
              { label: 'Details', onClick: () => onModal({ type: 'courseDetails', item }) },
              { label: 'Edit', onClick: () => onModal({ type: 'course', item }) },
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
  const [searchField, setSearchField] = useState<InstructorSearchField>('fullName')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [localRefreshToken, setLocalRefreshToken] = useState(0)
  const [updatingInstructorId, setUpdatingInstructorId] = useState<number | null>(null)
  const [statusError, setStatusError] = useState('')
  const { data, loading, error } = usePagedData(
    () => api.instructors.list({ search, searchField, status, page, pageSize: 20 }),
    [search, searchField, status, page, refreshToken, localRefreshToken],
  )

  const updateSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const updateSearchField = (value: string) => {
    setSearchField(value as InstructorSearchField)
    setPage(1)
  }

  const updateStatusFilter = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const updateStatus = async (item: Instructor, isActive: boolean) => {
    const action = isActive ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${action} ${personName(item)}?`)) return

    setStatusError('')
    setUpdatingInstructorId(item.id)
    try {
      await api.instructors.setStatus(item.id, isActive)
      setLocalRefreshToken((value) => value + 1)
    } catch (err) {
      setStatusError((err as Error).message)
    } finally {
      setUpdatingInstructorId(null)
    }
  }

  return (
    <section className="panel">
      <ListToolbar
        search={search}
        onSearch={updateSearch}
        searchPlaceholder={`Search by ${instructorSearchFields.find((item) => item.value === searchField)?.label.toLowerCase()}`}
        status={status}
        onStatus={updateStatusFilter}
        beforeSearch={
          <Select value={searchField} onChange={updateSearchField} label="Search by" options={instructorSearchFields} includeAllOption={false} />
        }
      />
      {error && <Alert tone="error" message={error} />}
      {statusError && <Alert tone="error" message={statusError} />}
      <DataTable
        loading={loading}
        emptyText="No instructors match the current filters."
        columns={['Name', 'Phone', 'Email', 'Status', 'Actions']}
        rows={data.items.map((item) => [
          <strong>{personName(item)}</strong>,
          item.phone,
          item.email ?? '-',
          <StatusToggle
            checked={item.status !== 'Inactive'}
            disabled={updatingInstructorId === item.id}
            onChange={(checked) => void updateStatus(item, checked)}
          />,
          <RowActions
            actions={[
              { label: 'Edit', onClick: () => onModal({ type: 'instructor', item }) },
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
    () => api.batches.list({ search, searchField: 'code', status, courseId, instructorId, page, pageSize: 20 }),
    [search, status, courseId, instructorId, page, refreshToken],
  )

  const updateSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const updateStatusFilter = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const updateCourseFilter = (value: string) => {
    setCourseId(value)
    setPage(1)
  }

  const updateInstructorFilter = (value: string) => {
    setInstructorId(value)
    setPage(1)
  }

  return (
    <section className="panel">
      <ListToolbar
        search={search}
        onSearch={updateSearch}
        searchPlaceholder="Search by batch code"
        status={status}
        onStatus={updateStatusFilter}
        statuses={batchStatuses}
      >
        <Combobox value={courseId} onChange={updateCourseFilter} label="Course" options={refs.courses.map(optionFromName)} allLabel="All courses" />
        <Combobox
          value={instructorId}
          onChange={updateInstructorFilter}
          label="Instructor"
          options={refs.instructors.map(optionFromPersonName)}
          allLabel="All instructors"
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
            ]}
          />,
        ])}
      />
      <Pagination data={data} onPage={setPage} />
    </section>
  )
}

function SchedulesPage({
  onModal,
  refreshToken,
  canManage,
}: {
  onModal: (modal: ModalState) => void
  refreshToken: number
  canManage: boolean
}) {
  const refs = useReferenceData(refreshToken)
  const [batchId, setBatchId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [localRefreshToken, setLocalRefreshToken] = useState(0)
  const [actionError, setActionError] = useState('')
  const { data, loading, error } = usePagedData(
    () =>
      api.schedules
        .list({ BatchId: batchId, CourseId: courseId, DayOfWeek: dayOfWeek, Status: status, page, pageSize: 20 })
        .then(schedulePageFrom),
    [batchId, courseId, dayOfWeek, status, page, refreshToken, localRefreshToken],
  )

  const updateBatchFilter = (value: string) => {
    setBatchId(value)
    setPage(1)
  }

  const updateCourseFilter = (value: string) => {
    setCourseId(value)
    setPage(1)
  }

  const updateDayFilter = (value: string) => {
    setDayOfWeek(value)
    setPage(1)
  }

  const updateStatusFilter = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const deactivate = async (item: Schedule) => {
    if (!window.confirm(`Deactivate schedule for ${item.batchCode || 'this batch'} on ${item.dayOfWeek}?`)) return
    setActionError('')
    try {
      await api.schedules.deactivate(scheduleIdValue(item))
      setLocalRefreshToken((value) => value + 1)
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  const columns = canManage
    ? ['Batch code', 'Course name', 'Instructor name', 'Day of week', 'Start time', 'End time', 'Room', 'Delivery mode', 'Status', 'Actions']
    : ['Batch code', 'Course name', 'Instructor name', 'Day of week', 'Start time', 'End time', 'Room', 'Delivery mode', 'Status']

  return (
    <section className="panel">
      <div className="toolbar">
        <Combobox
          value={batchId}
          onChange={updateBatchFilter}
          label="Batch"
          options={refs.batches.map(optionFromCode)}
          allLabel="All batches"
        />
        <Combobox
          value={courseId}
          onChange={updateCourseFilter}
          label="Course"
          options={refs.courses.map(optionFromName)}
          allLabel="All courses"
        />
        <Select
          value={dayOfWeek}
          onChange={updateDayFilter}
          label="Day of week"
          options={daysOfWeek.map((day) => ({ value: day, label: day }))}
        />
        <Select
          value={status}
          onChange={updateStatusFilter}
          label="Status"
          options={scheduleStatuses.map((item) => ({ value: item, label: item }))}
        />
      </div>
      {error && <Alert tone="error" message={error} />}
      {actionError && <Alert tone="error" message={actionError} />}
      <DataTable
        loading={loading}
        emptyText="No schedules match the current filters."
        columns={columns}
        rows={data.items.map((rawItem) => {
          const item = scheduleWithBatchDetails(normalizeSchedule(rawItem) ?? rawItem, refs.batches)
          const row: React.ReactNode[] = [
            <strong>{item.batchCode}</strong>,
            item.courseName,
            item.instructorName,
            item.dayOfWeek,
            formatTime(item.startTime),
            formatTime(item.endTime),
            item.room || '-',
            item.deliveryMode,
            <StatusBadge value={item.status} />,
          ]

          if (canManage) {
            row.push(
              <RowActions
                actions={[
                  { label: 'Create session', onClick: () => onModal({ type: 'classSession', schedule: item }) },
                  { label: 'Edit', onClick: () => onModal({ type: 'schedule', item }) },
                  { label: 'Deactivate schedule', danger: true, onClick: () => void deactivate(item) },
                ]}
              />,
            )
          }

          return row
        })}
      />
      <Pagination data={data} onPage={setPage} />
    </section>
  )
}

function ClassSessionsPage({
  onModal,
  onOpenAttendance,
  refreshToken,
  canManage,
}: {
  onModal: (modal: ModalState) => void
  onOpenAttendance: (classSessionId: number) => void
  refreshToken: number
  canManage: boolean
}) {
  const refs = useReferenceData(refreshToken, true, ['batches', 'schedules'])
  const [batchId, setBatchId] = useState('')
  const [scheduleId, setScheduleId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [localRefreshToken, setLocalRefreshToken] = useState(0)
  const [actionError, setActionError] = useState('')
  const selectedSchedule = refs.schedules.find((schedule) => String(scheduleIdValue(schedule)) === scheduleId)
  const scheduleOptions = batchId
    ? refs.schedules.filter((schedule) => String(schedule.batchId) === String(batchId) || String(scheduleIdValue(schedule)) === scheduleId)
    : refs.schedules
  const { data, loading, error } = usePagedData(
    () =>
      api.classSessions
        .list({ page, pageSize: 20, batchId: scheduleId ? undefined : batchId, scheduleId, from, to, status })
        .then(classSessionPageFrom),
    [batchId, scheduleId, from, to, status, page, refreshToken, localRefreshToken],
  )

  const resetPage = (work: () => void) => {
    work()
    setPage(1)
  }

  const updateBatchFilter = (value: string) => {
    resetPage(() => {
      setBatchId(value)
      if (selectedSchedule && value && String(selectedSchedule.batchId) !== String(value)) {
        setScheduleId('')
      }
    })
  }

  const updateScheduleFilter = (value: string) => {
    resetPage(() => {
      setScheduleId(value)
      const schedule = refs.schedules.find((item) => String(scheduleIdValue(item)) === value)
      if (schedule?.batchId) {
        setBatchId(String(schedule.batchId))
      }
    })
  }

  const cancel = async (item: ClassSession) => {
    if (!window.confirm(`Cancel ${item.batchCode || 'this class session'} on ${formatDate(item.sessionDate)}?`)) return
    setActionError('')
    try {
      await api.classSessions.cancel(classSessionIdValue(item))
      setLocalRefreshToken((value) => value + 1)
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  const columns = canManage
    ? ['Date', 'Time', 'Batch', 'Course', 'Instructor', 'Room', 'Delivery', 'Status', 'Actions']
    : ['Date', 'Time', 'Batch', 'Course', 'Instructor', 'Room', 'Delivery', 'Status', 'Attendance']

  return (
    <section className="panel">
      <div className="toolbar">
        <Field label="From">
          <input type="date" value={from} onChange={(event) => resetPage(() => setFrom(event.target.value))} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(event) => resetPage(() => setTo(event.target.value))} />
        </Field>
        <Combobox
          value={batchId}
          onChange={updateBatchFilter}
          label="Batch"
          options={refs.batches.map(optionFromCode)}
          allLabel="All batches"
        />
        <Combobox
          value={scheduleId}
          onChange={updateScheduleFilter}
          label="Schedule"
          options={scheduleOptions.map(optionFromSchedule)}
          allLabel="All schedules"
        />
        <Select
          value={status}
          onChange={(value) => resetPage(() => setStatus(value))}
          label="Status"
          options={classSessionStatuses.map((item) => ({ value: item, label: item }))}
        />
      </div>
      {refs.error && <Alert tone="error" message={refs.error} />}
      {error && <Alert tone="error" message={error} />}
      {actionError && <Alert tone="error" message={actionError} />}
      <DataTable
        loading={loading}
        emptyText="No class sessions match the current filters."
        columns={columns}
        rows={data.items.map((item) => {
          const isCancelled = item.status === 'Cancelled'
          const actions: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }[] = [
            {
              label: isCancelled ? 'Attendance disabled' : 'Mark attendance',
              disabled: isCancelled,
              onClick: () => onOpenAttendance(classSessionIdValue(item)),
            },
          ]

          if (canManage) {
            actions.unshift({ label: 'Edit', onClick: () => onModal({ type: 'classSession', item }) })
            actions.push({ label: 'Cancel', danger: true, disabled: isCancelled, onClick: () => void cancel(item) })
          }

          return [
            formatDate(item.sessionDate),
            `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`,
            <strong>{item.batchCode}</strong>,
            item.courseName || '-',
            item.instructorName || '-',
            item.room || '-',
            item.deliveryMode,
            <StatusBadge value={item.status} />,
            <RowActions actions={actions} />,
          ]
        })}
      />
      <Pagination data={data} onPage={setPage} />
    </section>
  )
}

function AttendancePage({ refreshToken }: { refreshToken: number }) {
  const initialSessionId = new URLSearchParams(window.location.search).get('classSessionId') ?? ''
  const [date, setDate] = useState(today())
  const [classSessionId, setClassSessionId] = useState(initialSessionId)
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [records, setRecords] = useState<Record<number, AttendanceStatus>>({})
  const [rosterSearch, setRosterSearch] = useState('')
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [traineesLoading, setTraineesLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const attendanceCounts = useMemo(
    () =>
      trainees.reduce(
        (counts, trainee) => {
          const status = records[trainee.id] ?? 'Present'
          counts[status] += 1
          counts.Total += 1
          return counts
        },
        { Present: 0, Absent: 0, Late: 0, Total: 0 } as Record<AttendanceStatus | 'Total', number>,
      ),
    [records, trainees],
  )
  const visibleTrainees = useMemo(() => {
    const query = rosterSearch.trim().toLowerCase()
    if (!query) return trainees
    return trainees.filter((trainee) => `${personName(trainee)} ${trainee.phone}`.toLowerCase().includes(query))
  }, [rosterSearch, trainees])

  useEffect(() => {
    setSessionsLoading(true)
    setError('')
    api.classSessions
      .list({ page: 1, pageSize: 100, from: date, to: date })
      .then((result) => {
        const items = classSessionPageFrom(result).items
        setSessions(items)
        const activeItems = items.filter((item) => item.status !== 'Cancelled')
        if (!classSessionId && activeItems.length === 1) {
          const nextSessionId = String(classSessionIdValue(activeItems[0]))
          setClassSessionId(nextSessionId)
          window.history.replaceState({}, '', `/attendance?classSessionId=${nextSessionId}`)
        }
        if (classSessionId && !items.some((item) => classSessionIdValue(item) === Number(classSessionId))) {
          return api.classSessions.get(Number(classSessionId)).then((item) => {
            const normalized = normalizeClassSession(item)
            if (normalized) {
              setSessions((current) => [normalized, ...current])
              setSelectedSession(normalized)
              setDate(dateValue(normalized.sessionDate) || date)
            }
          })
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSessionsLoading(false))
  }, [date, refreshToken])

  useEffect(() => {
    const nextSession = sessions.find((item) => classSessionIdValue(item) === Number(classSessionId)) ?? null
    setSelectedSession(nextSession)
  }, [classSessionId, sessions])

  useEffect(() => {
    if (!selectedSession?.batchId) {
      setTrainees([])
      setRecords({})
      return
    }
    setTraineesLoading(true)
    setError('')
    api.batches
      .trainees(selectedSession.batchId)
      .then((items) => {
        const traineeItems = normalizeTrainees(items)
        setTrainees(traineeItems)
        setRecords(Object.fromEntries(traineeItems.map((item) => [item.id, 'Present'])))
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setTraineesLoading(false))
  }, [selectedSession?.batchId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedSession || selectedSession.status === 'Cancelled') return
    setMessage('')
    setError('')
    try {
      await api.classSessions.attendance(
        classSessionIdValue(selectedSession),
        trainees.map((trainee) => ({ traineeId: trainee.id, status: records[trainee.id] ?? 'Present' })),
      )
      setMessage('Attendance saved successfully.')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const selectSession = (session: ClassSession) => {
    if (session.status === 'Cancelled') return
    const nextSessionId = String(classSessionIdValue(session))
    setClassSessionId(nextSessionId)
    setMessage('')
    setRosterSearch('')
    window.history.replaceState({}, '', `/attendance?classSessionId=${nextSessionId}`)
  }

  const markAll = (status: AttendanceStatus) => {
    setRecords(Object.fromEntries(trainees.map((trainee) => [trainee.id, status])))
    setMessage('')
  }

  return (
    <section className="panel attendance-panel">
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Attendance date">
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setClassSessionId('')
                setSelectedSession(null)
              }}
              required
            />
          </Field>
        </div>
        {message && <Alert tone="success" message={message} />}
        {error && <Alert tone="error" message={error} />}
        {sessionsLoading && <div className="state-box">Loading class sessions...</div>}
        {!sessionsLoading && sessions.length === 0 && <div className="state-box">No class sessions on this date.</div>}
        {sessions.length > 0 && (
          <div className="session-card-grid" aria-label="Class sessions for selected date">
            {sessions.map((session) => {
              const isSelected = classSessionIdValue(session) === Number(classSessionId)
              const isCancelled = session.status === 'Cancelled'
              return (
                <button
                  key={classSessionIdValue(session)}
                  className={`session-card status-${session.status.toLowerCase()}${isSelected ? ' active' : ''}`}
                  type="button"
                  disabled={isCancelled}
                  onClick={() => selectSession(session)}
                >
                  <span>
                    <strong>{formatTime(session.startTime)} - {formatTime(session.endTime)}</strong>
                    <StatusBadge value={session.status} />
                  </span>
                  <span>{session.batchCode} - {session.courseName || '-'}</span>
                  <small>{session.instructorName || '-'} - {session.room || 'No room'} - {session.deliveryMode}</small>
                </button>
              )
            })}
          </div>
        )}
        {selectedSession?.status === 'Cancelled' && <Alert tone="warning" message="This class session is cancelled, so attendance marking is disabled." />}
        {selectedSession && selectedSession.status === 'Completed' && <Alert tone="warning" message="This class session is completed. Saving again may update existing attendance." />}
        {selectedSession && (
          <div className="attendance-tools">
            <div className="attendance-counts">
              <span><strong>{attendanceCounts.Present}</strong> Present</span>
              <span><strong>{attendanceCounts.Absent}</strong> Absent</span>
              <span><strong>{attendanceCounts.Late}</strong> Late</span>
              <span><strong>{attendanceCounts.Total}</strong> Total</span>
            </div>
            <div className="toolbar inline-controls">
              <button className="secondary-button" type="button" onClick={() => markAll('Present')} disabled={trainees.length === 0}>
                Mark all present
              </button>
              <button className="secondary-button" type="button" onClick={() => markAll('Absent')} disabled={trainees.length === 0}>
                Mark all absent
              </button>
              <button className="secondary-button" type="button" onClick={() => markAll('Late')} disabled={trainees.length === 0}>
                Mark all late
              </button>
              <label className="control roster-search">
                <span>Search roster</span>
                <input value={rosterSearch} onChange={(event) => setRosterSearch(event.target.value)} placeholder="Name or phone" />
              </label>
            </div>
          </div>
        )}
        <DataTable
          loading={traineesLoading}
          emptyText={
            rosterSearch.trim()
              ? 'No trainees match the current roster search.'
              : classSessionId
                ? 'No enrolled trainees found for this session batch.'
                : 'Select a class session to load enrolled trainees.'
          }
          columns={['Trainee', 'Phone', 'Status']}
          rows={visibleTrainees.map((trainee) => [
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
          <button className="primary-button" type="submit" disabled={!selectedSession || selectedSession.status === 'Cancelled' || trainees.length === 0}>
            Submit attendance
          </button>
        </div>
      </form>
    </section>
  )
}

function CertificatesArea({
  onNavigate,
  path,
  onModal,
  refreshToken,
  onRefresh,
}: {
  onNavigate: (path: string) => void
  path: string
  onModal: (modal: ModalState) => void
  refreshToken: number
  onRefresh: () => void
}) {
  const normalizedPath = path.replace(/\/$/, '')
  const detailMatch = normalizedPath.match(/^\/certificates\/(\d+)$/)

  if (normalizedPath === '/certificates/new') {
    return <GenerateCertificatePage onNavigate={onNavigate} />
  }

  if (detailMatch) {
    return (
      <CertificateDetailsPage
        id={Number(detailMatch[1])}
        onNavigate={onNavigate}
        onModal={onModal}
        refreshToken={refreshToken}
      />
    )
  }

  return <CertificatesPage onNavigate={onNavigate} onModal={onModal} refreshToken={refreshToken} onRefresh={onRefresh} />
}

function CertificatesPage({
  onNavigate,
  onModal,
  refreshToken,
  onRefresh,
}: {
  onNavigate: (path: string) => void
  onModal: (modal: ModalState) => void
  refreshToken: number
  onRefresh: () => void
}) {
  const refs = useReferenceData(refreshToken, true, ['courses', 'batches'])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [courseId, setCourseId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState('')
  const { data, loading, error } = usePagedData<Certificate>(
    () => api.certificates.list({ search, status, courseId, batchId, page, pageSize: 20 }).then(certificatePageFrom),
    [search, status, courseId, batchId, page, refreshToken],
  )

  const resetPage = (work: () => void) => {
    work()
    setPage(1)
  }

  const download = async (item: Certificate) => {
    setActionError('')
    try {
      await downloadCertificate(item)
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  const columns = ['Certificate number', 'Trainee name', 'Course name', 'Batch code', 'Issue date', 'Status', 'Actions']

  return (
    <section className="panel">
      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(value) => resetPage(() => setSearch(value))}
          placeholder="Certificate number or trainee name"
        />
        <Select
          value={status}
          onChange={(value) => resetPage(() => setStatus(value))}
          label="Status"
          options={certificateStatuses.map((item) => ({ value: item, label: item }))}
        />
        <Combobox
          value={courseId}
          onChange={(value) => resetPage(() => setCourseId(value))}
          label="Course"
          options={refs.courses.map(optionFromName)}
          allLabel="All courses"
        />
        <Combobox
          value={batchId}
          onChange={(value) => resetPage(() => setBatchId(value))}
          label="Batch"
          options={refs.batches.map(optionFromCode)}
          allLabel="All batches"
        />
      </div>
      {refs.error && <Alert tone="error" message={refs.error} />}
      {error && <Alert tone="error" message={error} />}
      {actionError && <Alert tone="error" message={actionError} />}
      <DataTable
        loading={loading}
        emptyText={search || status || courseId || batchId ? 'No certificates match the current filters.' : 'No certificates issued yet.'}
        columns={columns}
        rows={data.items.map((item) => [
          <strong>{item.certificateNumber || '-'}</strong>,
          item.traineeName || '-',
          item.courseName || '-',
          item.batchCode || '-',
          formatDate(item.issueDate),
          <StatusBadge value={item.status} />,
          <RowActions
            actions={[
              { label: 'View details', onClick: () => onNavigate(`/certificates/${item.id}`) },
              { label: 'Download PDF', onClick: () => void download(item) },
              {
                label: 'Revoke',
                danger: true,
                disabled: item.status === 'Revoked',
                onClick: () => onModal({ type: 'revokeCertificate', item }),
              },
            ]}
          />,
        ])}
      />
      <Pagination data={data} onPage={setPage} />
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={() => onNavigate('/certificates/new')}>
          Generate certificate
        </button>
        <button className="ghost-button" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </section>
  )
}

function GenerateCertificatePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const refs = useReferenceData('generate-certificate', true, ['batches', 'courses'])
  const [batchId, setBatchId] = useState('')
  const [traineeId, setTraineeId] = useState('')
  const [completionDate, setCompletionDate] = useState(today())
  const [trainingHours, setTrainingHours] = useState('')
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [traineesLoading, setTraineesLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState<Certificate | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const selectedBatch = refs.batches.find((item) => String(item.id) === batchId)
  const selectedCourse = selectedBatch ? refs.courses.find((item) => item.id === selectedBatch.courseId) : undefined

  useEffect(() => {
    setTraineeId('')
    setGenerated(null)
    if (!selectedBatch) {
      setTrainees([])
      setTrainingHours('')
      return
    }

    setTrainingHours(
      String(
        numberField(recordFrom(selectedBatch), 'trainingHours', 'TrainingHours', 'durationHours', 'DurationHours') ||
          selectedCourse?.durationHours ||
          '',
      ),
    )
    setTraineesLoading(true)
    setError('')
    api.batches
      .trainees(selectedBatch.id)
      .then((items) => setTrainees(normalizeTrainees(items)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setTraineesLoading(false))
  }, [selectedBatch?.id, selectedCourse?.durationHours])

  const canSubmit = Boolean(batchId && traineeId && completionDate) && !submitting

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setMessage('')
    setError('')
    setGenerated(null)
    try {
      const body: GenerateCertificateRequest = {
        batchId: Number(batchId),
        traineeId: Number(traineeId),
        completionDate,
        trainingHours: trainingHours ? Number(trainingHours) : undefined,
      }
      const result = normalizeCertificate(await api.certificates.generate(body))
      if (result) {
        setGenerated(result)
        setMessage('Certificate generated successfully.')
      } else {
        setMessage('Certificate generated successfully.')
      }
    } catch (err) {
      setError(certificateFriendlyError(err as Error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel">
      <PanelHeader title="Generate certificate" actionLabel="Back to certificates" onAction={() => onNavigate('/certificates')} />
      {refs.error && <Alert tone="error" message={refs.error} />}
      {message && <Alert tone="success" message={message} />}
      {error && <Alert tone="error" message={error} />}
      <form className="record-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Batch">
            <select value={batchId} onChange={(event) => setBatchId(event.target.value)} required>
              <option value="" disabled>Select batch</option>
              {refs.batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.code} - {batch.courseName || 'Course'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trainee">
            <select value={traineeId} onChange={(event) => setTraineeId(event.target.value)} required disabled={!batchId || traineesLoading}>
              <option value="" disabled>{traineesLoading ? 'Loading trainees...' : 'Select trainee'}</option>
              {trainees.map((trainee) => (
                <option key={trainee.id} value={trainee.id}>
                  {personName(trainee)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Completion date">
            <input type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} required />
          </Field>
          <Field label="Training hours">
            <input type="number" min="0" value={trainingHours} onChange={(event) => setTrainingHours(event.target.value)} />
          </Field>
        </div>
        {selectedBatch && (
          <dl className="detail-list">
            <div><dt>Course</dt><dd>{selectedBatch.courseName || '-'}</dd></div>
            <div><dt>Batch code</dt><dd>{selectedBatch.code}</dd></div>
            <div><dt>Default hours</dt><dd>{trainingHours || '-'}</dd></div>
          </dl>
        )}
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={!canSubmit}>
            {submitting ? 'Generating...' : 'Generate certificate'}
          </button>
          {generated && (
            <>
              <button className="secondary-button" type="button" onClick={() => onNavigate(`/certificates/${generated.id}`)}>
                View details
              </button>
              <button className="ghost-button" type="button" onClick={() => void downloadCertificate(generated)}>
                Download PDF
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  )
}

function CertificateDetailsPage({
  id,
  onNavigate,
  onModal,
  refreshToken,
}: {
  id: number
  onNavigate: (path: string) => void
  onModal: (modal: ModalState) => void
  refreshToken: number
}) {
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.certificates
      .get(id)
      .then((result) => setCertificate(normalizeCertificate(result)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, refreshToken])

  const verificationLink = certificate?.verificationUrl || (certificate?.verificationToken ? `${window.location.origin}/verify/${certificate.verificationToken}` : '')

  return (
    <section className="panel">
      <PanelHeader title="Certificate details" actionLabel="Back to certificates" onAction={() => onNavigate('/certificates')} />
      {loading && <div className="state-box">Loading certificate...</div>}
      {error && <Alert tone="error" message={error} />}
      {actionError && <Alert tone="error" message={actionError} />}
      {certificate && (
        <div className="profile-view">
          <div className="profile-heading">
            <span className="profile-avatar">CT</span>
            <div>
              <h3>{certificate.certificateNumber || '-'}</h3>
              <p>{certificate.traineeName || '-'}</p>
            </div>
            <StatusBadge value={certificate.status} />
          </div>
          <dl className="detail-list">
            <div><dt>Certificate number</dt><dd>{certificate.certificateNumber || '-'}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge value={certificate.status} /></dd></div>
            <div><dt>Trainee</dt><dd>{certificate.traineeName || '-'}</dd></div>
            <div><dt>Course</dt><dd>{certificate.courseName || '-'}</dd></div>
            <div><dt>Batch</dt><dd>{certificate.batchCode || '-'}</dd></div>
            <div><dt>Training hours</dt><dd>{certificate.trainingHours ?? '-'}</dd></div>
            <div><dt>Completion date</dt><dd>{formatDate(certificate.completionDate)}</dd></div>
            <div><dt>Issue date</dt><dd>{formatDate(certificate.issueDate)}</dd></div>
            <div><dt>Issued by</dt><dd>{certificate.issuedBy || '-'}</dd></div>
            <div><dt>Verification link</dt><dd>{verificationLink ? <a href={verificationLink}>{verificationLink}</a> : '-'}</dd></div>
          </dl>
          {certificate.qrCodeUrl && <img className="certificate-preview" src={certificate.qrCodeUrl} alt="Certificate verification QR code" />}
          {certificate.status === 'Revoked' && (
            <dl className="detail-list">
              <div><dt>Revoked at</dt><dd>{formatDate(certificate.revokedAt)}</dd></div>
              <div><dt>Revoked by</dt><dd>{certificate.revokedBy || '-'}</dd></div>
              <div><dt>Revocation reason</dt><dd>{certificate.revocationReason || '-'}</dd></div>
            </dl>
          )}
          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => void downloadCertificate(certificate).catch((err: Error) => setActionError(err.message))}
            >
              Download PDF
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={certificate.status !== 'Issued'}
              onClick={() => onModal({ type: 'revokeCertificate', item: certificate })}
            >
              Revoke
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function CertificateSettingsPage() {
  const [settings, setSettings] = useState<CertificateSettings>({
    centerDisplayName: '',
    certificatePrefix: '',
    defaultCertificateTitle: '',
    signatoryName: '',
    signatoryTitle: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.certificateSettings
      .get()
      .then((result) => setSettings({ ...settings, ...result }))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const updateField = (key: keyof CertificateSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setMessage('')
  }

  const upload = async (kind: 'logo' | 'stamp' | 'signature', file?: File) => {
    if (!file) return
    setMessage('')
    setError('')
    try {
      const result =
        kind === 'logo'
          ? await api.certificateSettings.uploadLogo(file)
          : kind === 'stamp'
            ? await api.certificateSettings.uploadStamp(file)
            : await api.certificateSettings.uploadSignature(file)
      setSettings((current) => ({ ...current, ...result }))
      setMessage(`${kind[0].toUpperCase()}${kind.slice(1)} uploaded.`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const result = await api.certificateSettings.update(settings)
      setSettings((current) => ({ ...current, ...result }))
      setMessage('Certificate settings saved.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <PanelHeader title="Certificate Settings" actionLabel="Reload" onAction={() => window.location.reload()} />
      {loading && <div className="state-box">Loading certificate settings...</div>}
      {message && <Alert tone="success" message={message} />}
      {error && <Alert tone="error" message={error} />}
      {!loading && (
        <form className="record-form" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Center display name">
              <input value={settings.centerDisplayName} onChange={(event) => updateField('centerDisplayName', event.target.value)} />
            </Field>
            <Field label="Certificate prefix">
              <input value={settings.certificatePrefix} onChange={(event) => updateField('certificatePrefix', event.target.value)} />
            </Field>
            <Field label="Default certificate title">
              <input value={settings.defaultCertificateTitle} onChange={(event) => updateField('defaultCertificateTitle', event.target.value)} />
            </Field>
            <Field label="Signatory name">
              <input value={settings.signatoryName} onChange={(event) => updateField('signatoryName', event.target.value)} />
            </Field>
            <Field label="Signatory title">
              <input value={settings.signatoryTitle} onChange={(event) => updateField('signatoryTitle', event.target.value)} />
            </Field>
          </div>
          <div className="asset-grid">
            <AssetUpload label="Logo upload" imageUrl={settings.logoUrl} onUpload={(file) => void upload('logo', file)} />
            <AssetUpload label="Stamp upload" imageUrl={settings.stampUrl} onUpload={(file) => void upload('stamp', file)} />
            <AssetUpload label="Signature upload" imageUrl={settings.signatureUrl} onUpload={(file) => void upload('signature', file)} />
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function AssetUpload({ label, imageUrl, onUpload }: { label: string; imageUrl?: string | null; onUpload: (file?: File) => void }) {
  return (
    <div className="asset-upload">
      <Field label={label}>
        <input type="file" accept="image/*" onChange={(event) => onUpload(event.target.files?.[0])} />
      </Field>
      {imageUrl ? <img src={imageUrl} alt={`${label} preview`} /> : <span className="muted">No image uploaded</span>}
    </div>
  )
}

function PublicVerificationPage({ token }: { token: string }) {
  const [result, setResult] = useState<VerifyCertificateResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    setNotFound(false)
    api.certificates
      .verifyPublic(token)
      .then((value) => {
        if (!value || value.status === 'NotFound') {
          setNotFound(true)
          return
        }
        setResult(value)
      })
      .catch((err: Error & { status?: number }) => {
        if (err.status === 404) setNotFound(true)
        else setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [token])

  const centerName = result?.trainingCenterName || result?.centerDisplayName || '-'
  const isRevoked = result?.status === 'Revoked'

  return (
    <main className="verify-page">
      <section className="verify-card">
        <div className="brand">
          <span className="brand-mark">TC</span>
          <div>
            <strong>Certificate Verification</strong>
            <span>Training Ops</span>
          </div>
        </div>
        {loading && <div className="state-box">Verifying certificate...</div>}
        {notFound && <Alert tone="warning" message="Certificate not found." />}
        {error && <Alert tone="error" message={error} />}
        {result && (
          <div className="profile-view">
            <div className="profile-heading">
              <span className="profile-avatar">CT</span>
              <div>
                <h3>{result.certificateNumber || '-'}</h3>
                <p>{centerName}</p>
              </div>
              <StatusBadge value={result.status} />
            </div>
            {isRevoked && <Alert tone="warning" message="This certificate has been revoked." />}
            <dl className="detail-list">
              <div><dt>Certificate status</dt><dd><StatusBadge value={result.status} /></dd></div>
              <div><dt>Certificate number</dt><dd>{result.certificateNumber || '-'}</dd></div>
              <div><dt>Training center</dt><dd>{centerName}</dd></div>
              <div><dt>Trainee name</dt><dd>{result.traineeName || '-'}</dd></div>
              <div><dt>Course name</dt><dd>{result.courseName || '-'}</dd></div>
              <div><dt>Training hours</dt><dd>{result.trainingHours ?? '-'}</dd></div>
              <div><dt>Completion date</dt><dd>{formatDate(result.completionDate)}</dd></div>
              <div><dt>Issue date</dt><dd>{formatDate(result.issueDate)}</dd></div>
            </dl>
          </div>
        )}
      </section>
    </main>
  )
}

function RevokeCertificateForm({ certificate, onSubmit }: { certificate: Certificate; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const trimmedReason = reason.trim()

  return (
    <form
      className="record-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!trimmedReason) return
        onSubmit(trimmedReason)
      }}
    >
      <Alert tone="warning" message={`Revoking ${certificate.certificateNumber || 'this certificate'} cannot be undone from this screen.`} />
      <Field label="Revocation reason">
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} required />
      </Field>
      <div className="form-actions">
        <button className="danger-button" type="submit" disabled={!trimmedReason}>
          Revoke certificate
        </button>
      </div>
    </form>
  )
}

async function downloadCertificate(certificate: Certificate) {
  const blob = await api.certificates.download(certificate.id)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${certificate.certificateNumber || `certificate-${certificate.id}`}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

function certificateFriendlyError(error: Error) {
  const text = error.message || 'Unable to generate certificate.'
  const normalized = text.toLowerCase()
  if (normalized.includes('duplicate') || normalized.includes('already')) {
    return 'A certificate already exists for this trainee and batch.'
  }
  if (normalized.includes('enrolled') || normalized.includes('enrol')) {
    return 'The selected trainee is not enrolled in this batch.'
  }
  if (normalized.includes('revoked')) {
    return 'This certificate has been revoked.'
  }
  return text
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
            onSubmit={(body) => run(() => modal.item ? api.schedules.update(scheduleIdValue(modal.item), body) : api.schedules.create(body))}
          />
        )}
        {modal.type === 'classSession' && (
          <ClassSessionForm
            item={modal.item}
            sourceSchedule={modal.schedule}
            schedules={refs.schedules}
            onSubmit={(body) =>
              run(() =>
                modal.item
                  ? api.classSessions.update(classSessionIdValue(modal.item), body as UpdateClassSessionRequest)
                  : api.classSessions.create(body as CreateClassSessionRequest),
              )
            }
          />
        )}
        {modal.type === 'revokeCertificate' && (
          <RevokeCertificateForm certificate={modal.item} onSubmit={(reason) => run(() => api.certificates.revoke(modal.item.id, reason))} />
        )}
        {modal.type === 'user' && (
          <UserModalForm
            item={modal.item}
            onSubmit={(userItem, body) =>
              run(() => userItem ? api.users.update(userId(userItem), body as UpdateUserRequest) : api.users.create(body as CreateUserRequest))
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
        {modal.type === 'traineeProfile' && <TraineeProfile trainee={modal.item} />}
        {modal.type === 'courseDetails' && <CourseDetails course={modal.item} />}
        {modal.type === 'traineeHistory' && <TraineeHistory trainee={modal.item} tab={modal.tab} />}
      </section>
    </div>
  )
}

function modalTitle(modal: Exclude<ModalState, null>) {
  if (modal.type === 'batchTrainees') return `Manage ${modal.item.code}`
  if (modal.type === 'traineeProfile') return `${personName(modal.item)} profile`
  if (modal.type === 'courseDetails') return `${modal.item.code} details`
  if (modal.type === 'traineeHistory') return `${personName(modal.item)} history`
  if (modal.type === 'revokeCertificate') return `Revoke ${modal.item.certificateNumber || 'certificate'}`
  if (modal.type === 'user') return modal.item ? 'Edit user' : 'Create user'
  if (modal.type === 'tenant') return `${modal.item ? 'Edit' : 'Create'} tenant`
  if (modal.type === 'classSession') return `${modal.item ? 'Edit' : 'Create'} class session`
  return `${modal.item ? 'Edit' : 'Create'} ${modal.type}`
}

function referenceKindsForModal(modal: ModalState): ReferenceKind[] {
  if (!modal) return []
  if (modal.type === 'batch') return ['courses', 'instructors']
  if (modal.type === 'schedule') return ['batches']
  if (modal.type === 'classSession') return ['schedules']
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
          status: data.get('isActive') === 'on' ? 'Active' : 'Inactive',
        })
      }
    >
      <TextField name="FirstName" label="First name" defaultValue={item ? firstName(item) : ''} required />
      <TextField name="LastName" label="Last name" defaultValue={item ? lastName(item) : ''} required />
      <TextField name="phone" label="Phone" defaultValue={item?.phone} required />
      <TextField name="email" label="Email" type="email" defaultValue={item?.email ?? ''} />
      <TextField name="nationalId" label="National ID" defaultValue={item?.nationalId ?? ''} />
      <TextField name="registrationDate" label="Registration date" type="date" defaultValue={dateValue(item?.registrationDate) || today()} required />
      <Field label="Status">
        <span className="checkbox-control">
          <input name="isActive" type="checkbox" defaultChecked={item?.status !== 'Inactive'} />
          Active
        </span>
      </Field>
    </RecordForm>
  )
}

function CourseForm({ item, onSubmit }: { item?: Course; onSubmit: (body: Partial<Course>) => void }) {
  return (
    <RecordForm
      submitLabel={item ? 'Save course' : 'Create course'}
      onSubmit={(data) =>
        onSubmit({
          code: String(data.get('code')),
          name: String(data.get('name')),
          description: String(data.get('description')),
          durationHours: Number(data.get('durationHours')),
          status: String(data.get('status')) as EntityStatus,
        })
      }
    >
      <TextField name="code" label="Course code" defaultValue={item?.code} required />
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
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(item?.deliveryMode ?? 'InPerson')
  const [formError, setFormError] = useState('')

  return (
    <RecordForm
      submitLabel={item ? 'Save schedule' : 'Create schedule'}
      onSubmit={(data) => {
        const batchId = Number(data.get('batchId'))
        const dayOfWeek = String(data.get('dayOfWeek') || '')
        const startTime = timeForApi(data.get('startTime'))
        const endTime = timeForApi(data.get('endTime'))
        const room = String(data.get('room') ?? '').trim()
        const mode = String(data.get('deliveryMode')) as DeliveryMode

        if (!batchId || !dayOfWeek || !startTime || !endTime) {
          setFormError('Batch, day of week, start time, and end time are required.')
          return
        }

        if (endTime <= startTime) {
          setFormError('End time must be after start time.')
          return
        }

        if (mode === 'InPerson' && !room) {
          setFormError('Room is required for in-person schedules.')
          return
        }

        setFormError('')
        onSubmit({
          batchId,
          dayOfWeek: dayOfWeek as DayOfWeek,
          startTime,
          endTime,
          deliveryMode: mode,
          room: room || null,
          status: String(data.get('status')) as ScheduleStatus,
          notes: nullable(data.get('notes')),
        })
      }}
    >
      {formError && <Alert tone="error" message={formError} />}
      <SelectField name="batchId" label="Batch" defaultValue={item?.batchId} options={batches.map(optionFromCode)} />
      <SelectField name="dayOfWeek" label="Day of week" defaultValue={item?.dayOfWeek ?? 'Sunday'} options={daysOfWeek} />
      <TextField name="startTime" label="Start time" type="time" defaultValue={timeInputValue(item?.startTime, '09:00')} required />
      <TextField name="endTime" label="End time" type="time" defaultValue={timeInputValue(item?.endTime, '12:00')} required />
      <Field label="Delivery mode">
        <select
          name="deliveryMode"
          value={deliveryMode}
          onChange={(event) => setDeliveryMode(event.target.value as DeliveryMode)}
          required
        >
          {deliveryModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </Field>
      <TextField name="room" label="Room" defaultValue={item?.room ?? ''} required={deliveryMode === 'InPerson'} />
      <SelectField name="status" label="Status" defaultValue={item?.status ?? 'Active'} options={scheduleStatuses} />
      <Field label="Notes">
        <textarea name="notes" defaultValue={item?.notes ?? ''} rows={4} />
      </Field>
    </RecordForm>
  )
}

function ClassSessionForm({
  item,
  sourceSchedule,
  schedules,
  onSubmit,
}: {
  item?: ClassSession
  sourceSchedule?: Schedule
  schedules: Schedule[]
  onSubmit: (body: CreateClassSessionRequest | UpdateClassSessionRequest) => void
}) {
  const initialSchedule = sourceSchedule ?? schedules.find((schedule) => scheduleIdValue(schedule) === item?.scheduleId)
  const availableSchedules = sourceSchedule
    ? [sourceSchedule, ...schedules.filter((schedule) => scheduleIdValue(schedule) !== scheduleIdValue(sourceSchedule))]
    : schedules
  const [scheduleId, setScheduleId] = useState(String(item?.scheduleId ?? (initialSchedule ? scheduleIdValue(initialSchedule) : '')))
  const selectedSchedule = availableSchedules.find((schedule) => String(scheduleIdValue(schedule)) === scheduleId) ?? initialSchedule
  const [startTime, setStartTime] = useState(timeInputValue(item?.startTime ?? selectedSchedule?.startTime, ''))
  const [endTime, setEndTime] = useState(timeInputValue(item?.endTime ?? selectedSchedule?.endTime, ''))
  const [room, setRoom] = useState(item?.room ?? selectedSchedule?.room ?? '')
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(item?.deliveryMode ?? selectedSchedule?.deliveryMode ?? 'InPerson')
  const [formError, setFormError] = useState('')

  const chooseSchedule = (value: string) => {
    setScheduleId(value)
    const schedule = availableSchedules.find((candidate) => String(scheduleIdValue(candidate)) === value)
    if (!item && schedule) {
      setStartTime(timeInputValue(schedule.startTime, ''))
      setEndTime(timeInputValue(schedule.endTime, ''))
      setRoom(schedule.room ?? '')
      setDeliveryMode(schedule.deliveryMode)
    }
  }

  return (
    <RecordForm
      submitLabel={item ? 'Save class session' : 'Create class session'}
      onSubmit={(data) => {
        const submittedScheduleId = Number(data.get('scheduleId'))
        const sessionDate = String(data.get('sessionDate') || '')
        const submittedStartTime = timeForApi(data.get('startTime'))
        const submittedEndTime = timeForApi(data.get('endTime'))
        const submittedRoom = String(data.get('room') ?? '').trim()
        const mode = String(data.get('deliveryMode') || 'InPerson') as DeliveryMode
        const status = String(data.get('status') || 'Scheduled') as ClassSessionStatus

        if (!submittedScheduleId || !sessionDate) {
          setFormError('Schedule and session date are required.')
          return
        }

        if (submittedStartTime && submittedEndTime && submittedEndTime <= submittedStartTime) {
          setFormError('End time must be after start time.')
          return
        }

        if (mode === 'InPerson' && !submittedRoom) {
          setFormError('Room is required for in-person sessions.')
          return
        }

        setFormError('')

        if (item) {
          onSubmit({
            sessionDate,
            startTime: submittedStartTime,
            endTime: submittedEndTime,
            deliveryMode: mode,
            room: submittedRoom || null,
            status,
            notes: nullable(data.get('notes')),
          })
          return
        }

        onSubmit({
          scheduleId: submittedScheduleId,
          sessionDate,
          startTime: submittedStartTime || undefined,
          endTime: submittedEndTime || undefined,
          deliveryMode: mode,
          room: submittedRoom || null,
          status,
          notes: nullable(data.get('notes')),
        })
      }}
    >
      {formError && <Alert tone="error" message={formError} />}
      <Field label="Schedule">
        <select name="scheduleId" value={scheduleId} onChange={(event) => chooseSchedule(event.target.value)} required>
          <option value="" disabled>
            Select schedule
          </option>
          {availableSchedules.map((schedule) => {
            const option = optionFromSchedule(schedule)
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            )
          })}
        </select>
      </Field>
      {selectedSchedule && (
        <div className="state-box">
          <strong>{selectedSchedule.batchCode || 'Selected schedule'}</strong> - {selectedSchedule.dayOfWeek} from {formatTime(selectedSchedule.startTime)} to {formatTime(selectedSchedule.endTime)} - {selectedSchedule.room || 'No room'} - {selectedSchedule.deliveryMode}
        </div>
      )}
      <TextField name="sessionDate" label="Session date" type="date" defaultValue={dateValue(item?.sessionDate) || today()} required />
      <Field label="Start time">
        <input name="startTime" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
      </Field>
      <Field label="End time">
        <input name="endTime" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
      </Field>
      <Field label="Delivery mode">
        <select
          name="deliveryMode"
          value={deliveryMode}
          onChange={(event) => setDeliveryMode(event.target.value as DeliveryMode)}
          required
        >
          {deliveryModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Room">
        <input name="room" value={room} onChange={(event) => setRoom(event.target.value)} required={deliveryMode === 'InPerson'} />
      </Field>
      <SelectField name="status" label="Status" defaultValue={item?.status ?? 'Scheduled'} options={classSessionStatuses} />
      <Field label="Notes">
        <textarea name="notes" defaultValue={item?.notes ?? ''} rows={4} />
      </Field>
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

function UserModalForm({
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

function CourseDetails({ course: initialCourse }: { course: Course }) {
  const [course, setCourse] = useState<Course>(initialCourse)
  const [batches, setBatches] = useState<PagedResult<Batch>>(blankPage())
  const [counts, setCounts] = useState<BatchStatusCounts>(() => batchStatusCountsFrom(undefined))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const details = [
    { label: 'Code', value: course.code },
    { label: 'Name', value: course.name },
    { label: 'Description', value: course.description || '-' },
    { label: 'Duration', value: `${course.durationHours} hours` },
    { label: 'Active batches', value: course.activeBatchesCount },
  ]

  useEffect(() => {
    setLoading(true)
    setError('')
    setCourse(initialCourse)
    Promise.all([
      api.courses.get(initialCourse.id),
      api.batches.list({ courseId: initialCourse.id, page: 1, pageSize: 100 }),
      api.batches.statusCounts({ courseId: initialCourse.id }),
    ])
      .then(([courseResult, batchResult, countResult]) => {
        setCourse(normalizeCourse(courseResult) ?? initialCourse)
        setBatches(batchPageFrom(batchResult))
        setCounts(batchStatusCountsFrom(countResult))
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [initialCourse])

  return (
    <div className="profile-view">
      <div className="profile-heading">
        <div>
          <span className="profile-avatar">{course.code.slice(0, 2).toUpperCase()}</span>
        </div>
        <div>
          <h3>{course.name}</h3>
          <p>{course.code}</p>
        </div>
        <StatusBadge value={course.status} />
      </div>
      <dl className="detail-list">
        {details.map((detail) => (
          <div key={detail.label}>
            <dt>{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
      </dl>
      {error && <Alert tone="error" message={error} />}
      <section className="metric-grid">
        <Metric title="Planned" value={counts.planned} hint="Batches" loading={loading} />
        <Metric title="Active" value={counts.active} hint="Batches" loading={loading} />
        <Metric title="Completed" value={counts.completed} hint="Batches" loading={loading} />
        <Metric title="Cancelled" value={counts.cancelled} hint="Batches" loading={loading} />
        <Metric title="Total" value={counts.total} hint="All linked batches" loading={loading} />
      </section>
      <section className="profile-section">
        <h3>Linked batches</h3>
        <DataTable
          loading={loading}
          emptyText="No batches are linked to this course."
          columns={['Batch', 'Instructor', 'Dates', 'Capacity', 'Enrolled', 'Status']}
          rows={batches.items.map((item) => [
            <strong>{item.code}</strong>,
            item.instructorName || '-',
            `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`,
            item.capacity,
            item.enrolledCount,
            <StatusBadge value={item.status} />,
          ])}
        />
      </section>
    </div>
  )
}

function TraineeProfile({ trainee }: { trainee: Trainee }) {
  const [attendance, setAttendance] = useState<PagedResult<AttendanceRecord>>(blankPage())
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const details = [
    { label: 'First name', value: firstName(trainee) },
    { label: 'Last name', value: lastName(trainee) },
    { label: 'Phone', value: trainee.phone },
    { label: 'Email', value: trainee.email || '-' },
    { label: 'National ID', value: trainee.nationalId || '-' },
    { label: 'Registration date', value: formatDate(trainee.registrationDate) },
  ]

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
    <div className="profile-view">
      <div className="profile-heading">
        <div>
          <span className="profile-avatar">{initialsFor(trainee)}</span>
        </div>
        <div>
          <h3>{personName(trainee)}</h3>
          <p>{trainee.phone}</p>
        </div>
        <StatusBadge value={trainee.status} />
      </div>
      <dl className="detail-list">
        {details.map((detail) => (
          <div key={detail.label}>
            <dt>{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
      </dl>
      {error && <Alert tone="error" message={error} />}
      <section className="profile-section">
        <h3>Attendance</h3>
        <DataTable
          loading={loading}
          emptyText="No attendance records found."
          columns={['Session', 'Batch', 'Date', 'Status']}
          rows={attendance.items.map((item) => [item.classSessionId || '-', item.batchCode, formatDate(item.date), <StatusBadge value={item.status} />])}
        />
      </section>
      <section className="profile-section">
        <h3>Certificates</h3>
        <DataTable
          loading={loading}
          emptyText="No certificates found."
          columns={['Certificate', 'Course', 'Batch', 'Issued']}
          rows={certificates.map((item) => [item.certificateNumber || '-', item.courseName || '-', item.batchCode || '-', formatDate(item.issueDate)])}
        />
      </section>
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
          columns={['Session', 'Batch', 'Date', 'Status']}
          rows={attendance.items.map((item) => [item.classSessionId || '-', item.batchCode, formatDate(item.date), <StatusBadge value={item.status} />])}
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
  beforeSearch?: React.ReactNode
  status?: string
  onStatus?: (value: string) => void
  statuses?: string[]
  children?: React.ReactNode
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

function SearchInput({
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

function Select({
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

function Combobox({
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

function StatusToggle({
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

function RowActions({
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

function initialsFor(item: Trainee | Instructor) {
  const first = firstName(item)
  const last = lastName(item)
  const initials = [first, last].filter(Boolean).map((part) => part[0]).join('')
  return initials || personName(item).slice(0, 1)
}

function firstName(item: Trainee | Instructor) {
  const direct = item.FisrtName ?? item.fisrtName ?? item.FirstName ?? item.firstName
  if (direct) return direct
  const [first] = splitFullName(item)
  return first
}

function lastName(item: Trainee | Instructor) {
  const direct = item.LastName ?? item.lastName
  if (direct) return direct
  const [, last] = splitFullName(item)
  return last
}

function splitFullName(item: Trainee | Instructor) {
  const record = recordFrom(item)
  const fullName = stringField(record, 'fullName', 'FullName', 'traineeName', 'TraineeName', 'instructorName', 'InstructorName')
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return [fullName, '']
  return [parts.slice(0, -1).join(' '), parts.at(-1) ?? '']
}

function optionFromCode(item: Batch) {
  return { value: item.id, label: item.code }
}

function optionFromSchedule(item: Schedule) {
  return {
    value: scheduleIdValue(item),
    label: `${item.batchCode || 'Batch'} - ${item.dayOfWeek} ${formatTime(item.startTime)}-${formatTime(item.endTime)}`,
  }
}

function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function dateValue(value?: string) {
  return value ? value.slice(0, 10) : ''
}

export default App

