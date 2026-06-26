import type {
  Batch,
  BatchStatusCounts,
  Certificate,
  CertificateStatus,
  ClassSession,
  ClassSessionStatus,
  Course,
  DeliveryMode,
  Instructor,
  PagedResult,
  Schedule,
  ScheduleStatus,
  Tenant,
  TodaysClass,
  Trainee,
  UserAccount,
} from '../types'

export const blankPage = <T,>(pageSize = 20): PagedResult<T> => ({
  items: [],
  page: 1,
  pageSize,
  totalCount: 0,
  totalPages: 1,
})

export function arrayFrom<T>(value: unknown): T[] {
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

export function numberFrom(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

export function recordFrom(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return ''
}

export function numberField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    const numberValue = Number(value)
    if (Number.isFinite(numberValue) && numberValue > 0) return numberValue
  }
  return 0
}

export function normalizeTrainee(value: unknown): Trainee | null {
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

export function normalizeTrainees(value: unknown) {
  return arrayFrom<unknown>(value).map(normalizeTrainee).filter((item): item is Trainee => item !== null)
}

export function normalizeCourse(value: unknown): Course | null {
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

export function normalizeCourses(value: unknown) {
  return arrayFrom<unknown>(value).map(normalizeCourse).filter((item): item is Course => item !== null)
}

export function normalizeBatch(value: unknown): Batch | null {
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

export function normalizeBatches(value: unknown) {
  return arrayFrom<unknown>(value).map(normalizeBatch).filter((item): item is Batch => item !== null)
}

export function normalizeSchedule(value: unknown): Schedule | null {
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

export function schedulePageFrom(value: unknown): PagedResult<Schedule> {
  const page = pagedFrom<unknown>(value)
  return {
    ...page,
    items: page.items.map(normalizeSchedule).filter((item): item is Schedule => item !== null),
  }
}

export function scheduleIdValue(item: Schedule) {
  return item.scheduleId || item.id || 0
}

export function scheduleWithBatchDetails(item: Schedule, batches: Batch[]) {
  const batch = batches.find((candidate) => candidate.id === item.batchId)
  return {
    ...item,
    batchCode: item.batchCode || batch?.code || '-',
    courseName: item.courseName || batch?.courseName || '-',
    instructorName: item.instructorName || batch?.instructorName || '-',
  }
}

export function normalizeClassSession(value: unknown): ClassSession | null {
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

export function classSessionPageFrom(value: unknown): PagedResult<ClassSession> {
  const page = pagedFrom<unknown>(value)
  return {
    ...page,
    items: page.items.map(normalizeClassSession).filter((item): item is ClassSession => item !== null),
  }
}

export function classSessionIdValue(item: ClassSession | TodaysClass) {
  return numberField(recordFrom(item), 'classSessionId', 'ClassSessionId', 'id', 'Id')
}

export function normalizeTodaysClass(value: unknown): TodaysClass {
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

export function batchStatusCountsFrom(value: unknown): BatchStatusCounts {
  const record = recordFrom(value)
  return {
    planned: numberFrom(record.planned ?? record.Planned),
    active: numberFrom(record.active ?? record.Active),
    completed: numberFrom(record.completed ?? record.Completed),
    cancelled: numberFrom(record.cancelled ?? record.Cancelled),
    total: numberFrom(record.total ?? record.Total),
  }
}

export function normalizeCertificate(value: unknown): Certificate | null {
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

export function normalizeCertificates(value: unknown) {
  return arrayFrom<unknown>(value).map(normalizeCertificate).filter((item): item is Certificate => item !== null)
}

export function userDisplayName(user: UserAccount) {
  const record = recordFrom(user)
  const fullName = stringField(record, 'fullName', 'FullName')
  const firstName = stringField(record, 'firstName', 'FirstName')
  const lastName = stringField(record, 'lastName', 'LastName')
  return fullName || [firstName, lastName].filter(Boolean).join(' ') || stringField(record, 'email', 'Email')
}

export function firstNameFromUser(user?: UserAccount) {
  return user ? stringField(recordFrom(user), 'firstName', 'FirstName') : ''
}

export function lastNameFromUser(user?: UserAccount) {
  return user ? stringField(recordFrom(user), 'lastName', 'LastName') : ''
}

export function userRole(user: UserAccount) {
  return stringField(recordFrom(user), 'roleName', 'RoleName', 'role', 'Role') || '-'
}

export function userEmail(user: UserAccount) {
  return stringField(recordFrom(user), 'email', 'Email')
}

export function userPhone(user: UserAccount) {
  return stringField(recordFrom(user), 'phone', 'Phone') || '-'
}

export function userPhoneValue(user?: UserAccount) {
  return user ? stringField(recordFrom(user), 'phone', 'Phone') : ''
}

export function userId(user: UserAccount) {
  return numberField(recordFrom(user), 'id', 'Id', 'userId', 'UserId')
}

export function userTenantName(user: UserAccount) {
  return stringField(recordFrom(user), 'tenantName', 'TenantName')
}

export function userTenantId(user: UserAccount) {
  const record = recordFrom(user)
  const value = record.tenantId ?? record.TenantId
  return value === null || value === undefined ? '' : String(value)
}

export function userIsActive(user: UserAccount) {
  const record = recordFrom(user)
  return Boolean(record.isActive ?? record.IsActive)
}

export function normalizeRoles(value: unknown) {
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

export function normalizeRoleKey(role: string) {
  return role.replace(/\s+/g, '').toLowerCase()
}

export function rolesForCurrentUser(roles: string[], isSuperAdmin: boolean, isTenantAdmin: boolean) {
  const fallback = ['SuperAdmin', 'TenantAdmin', 'OperationsStaff', 'Instructor']
  const source = roles.length ? roles : fallback

  if (isSuperAdmin) return source
  if (isTenantAdmin) {
    return source.filter((role) => ['tenantadmin', 'operationsstaff', 'instructor'].includes(normalizeRoleKey(role)))
  }
  return []
}

export function isTenantRole(role: string) {
  return ['tenantadmin', 'operationsstaff', 'instructor'].includes(normalizeRoleKey(role))
}

export function usersPageFrom(value: unknown): PagedResult<UserAccount> {
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

export function tenantsPageFrom(value: unknown): PagedResult<Tenant> {
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

export function tenantIdValue(tenant: Tenant) {
  return numberField(recordFrom(tenant), 'id', 'Id')
}

export function tenantName(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'name', 'Name')
}

export function tenantSlug(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'slug', 'Slug')
}

export function tenantStatus(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'status', 'Status') || 'Active'
}

export function tenantCreatedAt(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'createdAt', 'CreatedAt')
}

export function tenantUpdatedAt(tenant: Tenant) {
  return stringField(recordFrom(tenant), 'updatedAt', 'UpdatedAt')
}

export function certificatePageFrom(value: unknown) {
  const page = pagedFrom<Certificate>(value)
  return {
    ...page,
    items: normalizeCertificates(value),
  }
}

export function coursePageFrom(value: unknown) {
  const page = pagedFrom<Course>(value)
  return {
    ...page,
    items: normalizeCourses(value),
  }
}

export function batchPageFrom(value: unknown) {
  const page = pagedFrom<Batch>(value)
  return {
    ...page,
    items: normalizeBatches(value),
  }
}

export function pagedFrom<T>(value: unknown, pageSize = 20): PagedResult<T> {
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

export const today = () => new Date().toISOString().slice(0, 10)
export const formatDate = (value?: string | null) => (value ? new Intl.DateTimeFormat('en-SA').format(new Date(value)) : '-')
export const formatTime = (value?: string | null) => (value ? value.slice(0, 5) : '-')
export const timeInputValue = (value?: string | null, fallback = '') => (value ? value.slice(0, 5) : fallback)
export const timeForApi = (value: FormDataEntryValue | null) => {
  const time = String(value ?? '').trim()
  return time.length === 5 ? `${time}:00` : time
}

export function optionFromName(item: Course) {
  return { value: item.id, label: `${item.code} - ${item.name}` }
}

export function optionFromPersonName(item: Trainee | Instructor) {
  return { value: item.id, label: personName(item) }
}

export function personName(item: Trainee | Instructor) {
  const explicit = stringField(recordFrom(item), 'traineeName', 'TraineeName', 'instructorName', 'InstructorName', 'fullName', 'FullName')
  if (explicit) return explicit
  return [firstName(item), lastName(item)].filter(Boolean).join(' ') || `#${item.id}`
}

export function initialsFor(item: Trainee | Instructor) {
  return [firstName(item), lastName(item)]
    .filter(Boolean)
    .map((value) => value[0])
    .join('')
    .slice(0, 2)
}

export function firstName(item: Trainee | Instructor) {
  return stringField(recordFrom(item), 'firstName', 'FirstName', 'fisrtName', 'FisrtName')
}

export function lastName(item: Trainee | Instructor) {
  return stringField(recordFrom(item), 'lastName', 'LastName')
}

export function splitFullName(item: Trainee | Instructor) {
  const explicit = stringField(recordFrom(item), 'traineeName', 'TraineeName', 'instructorName', 'InstructorName', 'fullName', 'FullName')
  const [first = '', ...rest] = explicit.split(' ')
  return { first, last: rest.join(' ') }
}

export function optionFromCode(item: Batch) {
  return { value: item.id, label: `${item.code} - ${item.courseName}` }
}

export function optionFromSchedule(item: Schedule) {
  return {
    value: scheduleIdValue(item),
    label: `${item.batchCode || '-'} - ${item.dayOfWeek} ${formatTime(item.startTime)}-${formatTime(item.endTime)}`,
  }
}

export function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text || null
}

export function dateValue(value?: string) {
  return value ? value.slice(0, 10) : ''
}

