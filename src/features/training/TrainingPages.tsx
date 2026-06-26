import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import type { ModalState } from '../../app/types'
import { attendanceStatuses, batchStatuses, classSessionStatuses, daysOfWeek, deliveryModes, entityStatuses, scheduleStatuses, type AttendanceRecord, type AttendanceStatus, type Batch, type BatchStatus, type BatchStatusCounts, type Certificate, type ClassSession, type ClassSessionStatus, type Course, type CreateClassSessionRequest, type DayOfWeek, type DeliveryMode, type EntityStatus, type Instructor, type PagedResult, type Schedule, type ScheduleStatus, type Trainee, type UpdateClassSessionRequest } from '../../types'
import { Alert, Combobox, DataTable, Field, ListToolbar, Pagination, RecordForm, RowActions, Select, SelectField, Segmented, StatusBadge, StatusToggle, TextField } from '../../components/ui'
import { usePagedData, useReferenceData } from '../../shared/hooks'
import { batchPageFrom, batchStatusCountsFrom, blankPage, classSessionIdValue, classSessionPageFrom, coursePageFrom, dateValue, firstName, formatDate, formatTime, initialsFor, lastName, normalizeCertificates, normalizeClassSession, normalizeCourse, normalizeSchedule, normalizeTrainee, normalizeTrainees, nullable, optionFromCode, optionFromName, optionFromPersonName, optionFromSchedule, pagedFrom, personName, scheduleIdValue, schedulePageFrom, scheduleWithBatchDetails, timeForApi, timeInputValue, today } from '../../shared/helpers'
import { Metric } from '../dashboard/DashboardPage'

type TraineeSearchField = 'fullName' | 'phone' | 'nationalId'
type CourseSearchField = 'code' | 'name'
type InstructorSearchField = 'fullName' | 'phone'

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

export function TraineesPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
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

export function CoursesPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
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

export function InstructorsPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
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

export function BatchesPage({ onModal, refreshToken }: { onModal: (modal: ModalState) => void; refreshToken: number }) {
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

export function SchedulesPage({
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

export function ClassSessionsPage({
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

export function AttendancePage({ refreshToken }: { refreshToken: number }) {
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

export function TraineeForm({ item, onSubmit }: { item?: Trainee; onSubmit: (body: Partial<Trainee>) => void }) {
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

export function CourseForm({ item, onSubmit }: { item?: Course; onSubmit: (body: Partial<Course>) => void }) {
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

export function InstructorForm({ item, onSubmit }: { item?: Instructor; onSubmit: (body: Partial<Instructor>) => void }) {
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

export function BatchForm({
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

export function ScheduleForm({
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

export function ClassSessionForm({
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

export function BatchTraineesManager({ batch, allTrainees }: { batch: Batch; allTrainees: Trainee[] }) {
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

export function CourseDetails({ course: initialCourse }: { course: Course }) {
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

export function TraineeProfile({ trainee }: { trainee: Trainee }) {
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

export function TraineeHistory({ trainee, tab }: { trainee: Trainee; tab: 'attendance' | 'certificates' }) {
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
