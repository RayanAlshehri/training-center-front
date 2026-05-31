import type { AuthUser } from '../types/auth'

const ACCESS_TOKEN_KEY = 'training_ops_access_token'
const REFRESH_TOKEN_KEY = 'training_ops_refresh_token'
const USER_KEY = 'training_ops_user'

export const AUTH_SESSION_CHANGED_EVENT = 'training_ops_auth_session_changed'

function notifySessionChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.')

  if (!payload) return {}

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return {}
  }
}

function firstClaim(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' || typeof value === 'number') return value
  }
  return undefined
}

function permissionsFromClaims(payload: Record<string, unknown>, fallback: string[]) {
  const permissionKeys = [
    'permissions',
    'permission',
    'Permission',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  ]
  const values = permissionKeys.flatMap((key) => {
    const value = payload[key]
    if (Array.isArray(value)) return value
    if (typeof value === 'string') return value.split(/[,\s]+/)
    return []
  })

  return Array.from(new Set([...fallback, ...values.filter((value): value is string => typeof value === 'string' && value.length > 0)]))
}

export function authUserFromToken(accessToken: string, user?: AuthUser): AuthUser {
  const payload = decodeJwtPayload(accessToken)
  const idValue = firstClaim(payload, [
    'userId',
    'UserId',
    'sub',
    'nameid',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  ])
  const role = firstClaim(payload, [
    'role',
    'Role',
    'roleName',
    'RoleName',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  ])
  const email = firstClaim(payload, ['email', 'Email', 'unique_name'])
  const tenantId = firstClaim(payload, ['tenantId', 'TenantId', 'tenant_id'])
  const firstName = firstClaim(payload, ['firstName', 'FirstName', 'given_name'])
  const lastName = firstClaim(payload, ['lastName', 'LastName', 'family_name'])
  const name = firstClaim(payload, ['fullName', 'FullName', 'name'])

  return {
    id: Number(user?.id ?? idValue ?? 0),
    fullName: user?.fullName || String((name ?? [firstName, lastName].filter(Boolean).join(' ')) || email || ''),
    email: user?.email || String(email ?? ''),
    role: user?.role || String(role ?? ''),
    tenantId: user?.tenantId ?? tenantId ?? null,
    permissions: permissionsFromClaims(payload, user?.permissions ?? []),
  }
}

export function saveSession(session: {
  accessToken: string
  refreshToken: string
  user?: AuthUser
}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(authUserFromToken(session.accessToken, session.user)))

  notifySessionChanged()
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  notifySessionChanged()
}
