import type { RouteKey } from './types'

export const navItems: { key: RouteKey; label: string; icon: string }[] = [
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

export const routeTitles: Record<RouteKey, string> = {
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

export function routeFromPath(): RouteKey {
  const path = window.location.pathname.replace(/\/$/, '')
  if (path === '/platform/tenants') return 'platform-tenants'
  if (path === '/certificate-settings') return 'certificate-settings'
  if (path === '/certificates' || path.startsWith('/certificates/')) return 'certificates'
  const segment = path.replace(/^\//, '') as RouteKey
  return navItems.some((item) => item.key === segment) ? segment : 'dashboard'
}

export function pathForRoute(route: RouteKey) {
  if (route === 'dashboard') return '/'
  if (route === 'platform-tenants') return '/platform/tenants'
  if (route === 'certificate-settings') return '/certificate-settings'
  return '/' + route
}
