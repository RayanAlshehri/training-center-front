import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { Batch, Course, Instructor, PagedResult, Schedule, Trainee } from '../types'
import type { ReferenceKind } from '../app/types'
import { arrayFrom, blankPage, normalizeBatches, normalizeCourses, normalizeTrainees, pagedFrom, schedulePageFrom } from './helpers'

export function usePagedData<T>(loader: () => Promise<PagedResult<T>>, deps: unknown[]) {
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

export const allReferenceKinds: ReferenceKind[] = ['trainees', 'courses', 'instructors', 'batches']

export function useReferenceData(refreshToken: number | string, enabled = true, kinds: ReferenceKind[] = allReferenceKinds) {
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

