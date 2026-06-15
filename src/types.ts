export type EntityStatus = 'Active' | 'Inactive'
export type BatchStatus = 'Planned' | 'Active' | 'Completed' | 'Cancelled'
export type AttendanceStatus = 'Present' | 'Absent' | 'Late'
export type DeliveryMode = 'InPerson' | 'Online' | 'Hybrid'
export type ScheduleStatus = 'Active' | 'Inactive'
export type DayOfWeek =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'

export const entityStatuses: EntityStatus[] = ['Active', 'Inactive']
export const batchStatuses: BatchStatus[] = ['Planned', 'Active', 'Completed', 'Cancelled']
export const attendanceStatuses: AttendanceStatus[] = ['Present', 'Absent', 'Late']
export const deliveryModes: DeliveryMode[] = ['InPerson', 'Online', 'Hybrid']
export const scheduleStatuses: ScheduleStatus[] = ['Active', 'Inactive']
export const daysOfWeek: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface Trainee {
  id: number
  FirstName?: string
  FisrtName?: string
  firstName?: string
  fisrtName?: string
  LastName: string
  lastName?: string
  phone: string
  email: string | null
  nationalId: string | null
  registrationDate: string
  status: EntityStatus
}

export interface Instructor {
  id: number
  FirstName?: string
  FisrtName?: string
  firstName?: string
  fisrtName?: string
  LastName: string
  lastName?: string
  phone: string
  email: string | null
  status: EntityStatus
}

export interface Course {
  id: number
  code: string
  name: string
  Name?: string
  description: string
  durationHours: number
  status: EntityStatus
  activeBatchesCount: number
}

export interface Batch {
  id: number
  code: string
  courseId: number
  courseName: string
  instructorId: number
  instructorName: string
  startDate: string
  endDate: string
  capacity: number
  status: BatchStatus
  enrolledCount: number
}

export interface BatchStatusCounts {
  planned: number
  active: number
  completed: number
  cancelled: number
  total: number
}

export interface Schedule {
  id?: number
  scheduleId: number
  batchId: number
  batchCode: string
  courseName: string
  instructorId: number
  instructorName: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  room: string | null
  deliveryMode: DeliveryMode
  status: ScheduleStatus
  notes: string | null
}

export interface AttendanceRecord {
  id: number
  batchId: number
  batchCode: string
  traineeId: number
  traineeName: string
  date: string
  status: AttendanceStatus
}

export interface Certificate {
  id: number
  certificateNumber: string
  traineeId: number
  traineeName: string
  courseId: number
  courseName: string
  batchId: number
  batchCode: string
  issueDate: string
  completionDate: string
}

export interface UserAccount {
  id: number
  userId?: number
  UserId?: number
  firstName?: string
  FirstName?: string
  lastName?: string
  LastName?: string
  fullName?: string
  FullName?: string
  email: string
  Email?: string
  roleName?: string
  RoleName?: string
  role?: string
  Role?: string
  tenantId?: number | string | null
  TenantId?: number | string | null
  tenantName?: string | null
  TenantName?: string | null
  isActive: boolean
  IsActive?: boolean
}

export interface CreateUserRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  roleName: string
  tenantId?: number | string | null
  isActive: boolean
}

export interface UpdateUserRequest {
  firstName: string
  lastName: string
  email: string
  roleName: string
  tenantId?: number | string | null
  isActive: boolean
}

export type TenantStatus = 'Active' | 'Suspended'

export interface Tenant {
  id: number
  Id?: number
  name: string
  Name?: string
  slug: string
  Slug?: string
  status: TenantStatus
  Status?: TenantStatus
  createdAt?: string | null
  CreatedAt?: string | null
  updatedAt?: string | null
  UpdatedAt?: string | null
}

export interface CreateTenantRequest {
  name: string
  slug: string
}

export interface DashboardSummary {
  totalTrainees?: number
  activeBatches?: number
  todaysClasses?: number
  presentCount?: number
  absentCount?: number
  lateCount?: number
  attendanceRate?: number
}

export interface TodaysClass {
  id?: number
  scheduleId?: number
  batchId?: number
  batchCode: string
  courseName?: string
  instructorName?: string
  startTime: string
  endTime: string
  room?: string | null
  deliveryMode?: DeliveryMode
  status?: ScheduleStatus
}

export interface AttendanceSummary {
  presentCount: number
  absentCount: number
  lateCount: number
  totalCount?: number
  attendanceRate?: number
}

export interface ProblemDetails {
  title?: string
  detail?: string
  status?: number
  errors?: Record<string, string[]>
}

export type ApiError = Error & {
  status?: number
  details?: ProblemDetails
  retryAfter?: number
}

export interface AuthUser {
  id: number
  fullName: string
  email: string
  role: string
  permissions: string[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  requiresTwoFactor: boolean
  challengeId: string
  message: string
}

export interface VerifyOtpRequest {
  challengeId: string
  code: string
}

export interface VerifyOtpResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: AuthUser
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
}
