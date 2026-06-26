import { useEffect, useState } from 'react'
import type { RouteKey } from '../../app/types'
import type { TodaysClass } from '../../types'
import { api } from '../../services/api'
import { arrayFrom, classSessionIdValue, formatDate, formatTime, normalizeTodaysClass, numberFrom, today } from '../../shared/helpers'
import { Alert, DataTable, PanelHeader, RowActions, StatusBadge } from '../../components/ui'

export function DashboardPage({
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

export function Metric({
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

