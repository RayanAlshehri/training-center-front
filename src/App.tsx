import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { api } from './services/api'
import type { ModalState, RouteKey } from './app/types'
import { AppModal } from './app/AppModal'
import { navItems, pathForRoute, routeFromPath, routeTitles } from './app/navigation'
import { Alert, AccessDenied } from './components/ui'
import { formatDate, today } from './shared/helpers'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { AttendancePage, BatchesPage, ClassSessionsPage, CoursesPage, InstructorsPage, SchedulesPage, TraineesPage } from './features/training/TrainingPages'
import { CertificateSettingsPage, CertificatesArea, PublicVerificationPage } from './features/certificates/Certificates'
import { TenantsPage } from './features/tenants/Tenants'
import { UsersPage } from './features/users/Users'

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
    setPath('/attendance?classSessionId=' + classSessionId)
    window.history.pushState({}, '', '/attendance?classSessionId=' + classSessionId)
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
  const item = config[route]
  if (!item) return <span className="muted">Today: {formatDate(today())}</span>
  return (
    <button className="primary-button" type="button" onClick={() => onAction(item.modal)}>
      <span aria-hidden="true">+</span>
      {item.label}
    </button>
  )
}

export default App

