import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  Batch,
  BatchStatusCounts,
  Certificate,
  CreateTenantRequest,
  CreateUserRequest,
  Course,
  DashboardSummary,
  Instructor,
  PagedResult,
  Schedule,
  TodaysClass,
  Trainee,
  Tenant,
  UpdateUserRequest,
  UserAccount,
} from '../types'
import { apiBaseUrl, request } from './request'

type QueryValue = string | number | boolean | null | undefined
type QueryParams = Record<string, QueryValue>

function toQuery(params?: QueryParams) {
  const search = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
})

const putJson = (body: unknown): RequestInit => ({
  method: 'PUT',
  body: JSON.stringify(body),
})

export const api = {
  baseUrl: apiBaseUrl,
  dashboard: {
    summary: () => request<DashboardSummary>('/api/dashboard/summary'),
    totalTrainees: () => request<number>('/api/dashboard/total-trainees'),
    activeBatches: () => request<number>('/api/dashboard/active-batches'),
    todaysClasses: () => request<TodaysClass[]>('/api/dashboard/todays-classes'),
    attendanceSummary: (date: string) =>
      request<AttendanceSummary>(`/api/dashboard/attendance-summary${toQuery({ date })}`),
  },
  trainees: {
    list: (params: QueryParams) => request<PagedResult<Trainee>>(`/api/trainees${toQuery(params)}`),
    get: (id: number) => request<Trainee>(`/api/trainees/${id}`),
    create: (body: Partial<Trainee>) => request<Trainee>('/api/trainees', json(body)),
    update: (id: number, body: Partial<Trainee>) => request<Trainee>(`/api/trainees/${id}`, putJson(body)),
    setStatus: (id: number, status: boolean) =>
      request<void>(`/api/trainees/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    delete: (id: number) => request<void>(`/api/trainees/${id}`, { method: 'DELETE' }),
    attendance: (id: number, params: QueryParams) =>
      request<PagedResult<AttendanceRecord>>(`/api/trainees/${id}/attendance${toQuery(params)}`),
    certificates: (id: number) => request<Certificate[]>(`/api/trainees/${id}/certificates`),
  },
  instructors: {
    list: (params: QueryParams) => request<PagedResult<Instructor>>(`/api/Instructors${toQuery(params)}`),
    create: (body: Partial<Instructor>) => request<Instructor>('/api/Instructors', json(body)),
    update: (id: number, body: Partial<Instructor>) =>
      request<Instructor>(`/api/Instructors/${id}`, putJson(body)),
    delete: (id: number) => request<void>(`/api/Instructors/${id}`, { method: 'DELETE' }),
  },
  courses: {
    list: (params: QueryParams) => request<PagedResult<Course>>(`/api/Courses${toQuery(params)}`),
    get: (id: number) => request<Course>(`/api/Courses/${id}`),
    create: (body: Partial<Course>) => request<Course>('/api/Courses', json(body)),
    update: (id: number, body: Partial<Course>) => request<Course>(`/api/Courses/${id}`, putJson(body)),
    setStatus: (id: number, status: boolean) =>
      request<void>(`/api/Courses/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    delete: (id: number) => request<void>(`/api/Courses/${id}`, { method: 'DELETE' }),
  },
  batches: {
    statusCounts: (params?: QueryParams) => request<BatchStatusCounts>(`/api/Batches/status-counts${toQuery(params)}`),
    list: (params: QueryParams) => request<PagedResult<Batch>>(`/api/batches${toQuery(params)}`),
    create: (body: Partial<Batch>) => request<Batch>('/api/batches', json(body)),
    update: (id: number, body: Partial<Batch>) => request<Batch>(`/api/batches/${id}`, putJson(body)),
    delete: (id: number) => request<void>(`/api/batches/${id}`, { method: 'DELETE' }),
    trainees: (batchId: number) => request<Trainee[]>(`/api/batches/${batchId}/trainees`),
    addTrainee: (batchId: number, traineeId: number) =>
      request<void>(`/api/batches/${batchId}/trainees`, json({ traineeId })),
    removeTrainee: (batchId: number, traineeId: number) =>
      request<void>(`/api/batches/${batchId}/trainees/${traineeId}`, { method: 'DELETE' }),
    attendance: (batchId: number, date: string, records: { traineeId: number; status: AttendanceStatus }[]) =>
      request<void>(`/api/batches/${batchId}/attendance`, json({ date, records })),
  },
  schedules: {
    list: (params: QueryParams) => request<PagedResult<Schedule>>(`/api/schedules${toQuery(params)}`),
    create: (body: Partial<Schedule>) => request<Schedule>('/api/schedules', json(body)),
    update: (id: number, body: Partial<Schedule>) =>
      request<Schedule>(`/api/schedules/${id}`, putJson(body)),
    delete: (id: number) => request<void>(`/api/schedules/${id}`, { method: 'DELETE' }),
  },
  certificates: {
    list: (params: QueryParams) => request<PagedResult<Certificate>>(`/api/certificates${toQuery(params)}`),
    get: (id: number) => request<Certificate>(`/api/certificates/${id}`),
    create: (body: Partial<Certificate>) => request<Certificate>('/api/certificates', json(body)),
  },
  users: {
    list: () => request<UserAccount[] | PagedResult<UserAccount>>('/api/users'),
    get: (id: number) => request<UserAccount>(`/api/users/${id}`),
    roles: () => request<string[]>('/api/users/roles'),
    create: (body: CreateUserRequest) => request<UserAccount>('/api/users', json(body)),
    update: (id: number, body: UpdateUserRequest) => request<UserAccount>(`/api/users/${id}`, putJson(body)),
    assignRole: (id: number, roleName: string) =>
      request<UserAccount>(`/api/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ roleName }),
      }),
    setStatus: (id: number, isActive: boolean) =>
      request<UserAccount>(`/api/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
  },
  tenants: {
    list: () => request<Tenant[] | PagedResult<Tenant>>('/api/platform/tenants'),
    get: (id: number) => request<Tenant>(`/api/platform/tenants/${id}`),
    create: (body: CreateTenantRequest) => request<Tenant>('/api/platform/tenants', json(body)),
    update: (id: number, body: CreateTenantRequest) =>
      request<Tenant>(`/api/platform/tenants/${id}`, putJson(body)),
    suspend: (id: number) => request<void>(`/api/platform/tenants/${id}/suspend`, { method: 'POST' }),
    reactivate: (id: number) => request<void>(`/api/platform/tenants/${id}/reactivate`, { method: 'POST' }),
  },
}
