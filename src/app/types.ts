import type { Batch, Certificate, ClassSession, Course, Instructor, Schedule, Tenant, Trainee, UserAccount } from '../types'

export type RouteKey =
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

export type ModalState =
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

export type ReferenceKind = 'trainees' | 'courses' | 'instructors' | 'batches' | 'schedules'

