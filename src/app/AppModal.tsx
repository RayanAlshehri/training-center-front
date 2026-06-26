import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { CreateClassSessionRequest, CreateUserRequest, UpdateClassSessionRequest, UpdateUserRequest } from '../types'
import type { ModalState, ReferenceKind } from './types'
import { Alert } from '../components/ui'
import { useReferenceData } from '../shared/hooks'
import { classSessionIdValue, personName, scheduleIdValue, tenantIdValue, userId } from '../shared/helpers'
import { BatchForm, BatchTraineesManager, ClassSessionForm, CourseDetails, CourseForm, InstructorForm, ScheduleForm, TraineeForm, TraineeHistory, TraineeProfile } from '../features/training/TrainingPages'
import { RevokeCertificateForm } from '../features/certificates/Certificates'
import { TenantForm } from '../features/tenants/Tenants'
import { UserModalForm } from '../features/users/Users'

export function AppModal({
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

export function ModalContent({
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

export function modalTitle(modal: Exclude<ModalState, null>) {
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

export function referenceKindsForModal(modal: ModalState): ReferenceKind[] {
  if (!modal) return []
  if (modal.type === 'batch') return ['courses', 'instructors']
  if (modal.type === 'schedule') return ['batches']
  if (modal.type === 'classSession') return ['schedules']
  if (modal.type === 'batchTrainees') return ['trainees']
  return []
}

