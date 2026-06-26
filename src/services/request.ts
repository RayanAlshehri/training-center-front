import { clearSession, getAccessToken, getRefreshToken, saveSession } from '../auth/session'
import type { ApiError, ProblemDetails } from '../types'
import type { RefreshTokenResponse } from '../types/auth'

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7122').replace(/\/$/, '')

const apiUrl = (path: string) => `${apiBaseUrl}${path}`

let refreshPromise: Promise<RefreshTokenResponse> | null = null

function problemMessage(problem: ProblemDetails, fallback: string) {
  const validation = problem.errors
    ? Object.entries(problem.errors)
        .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
        .join(' ')
    : ''

  return validation || problem.detail || problem.title || fallback
}

async function refreshTokens() {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('Missing refresh token')
  }

  const response = await fetch(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    console.error('Token refresh failed', {
      status: response.status,
      body: await response.text(),
    })
    throw new Error('Refresh failed')
  }

  return response.json() as Promise<RefreshTokenResponse>
}

async function getFreshTokens() {
  refreshPromise ??= refreshTokens()
    .then((refreshed) => {
      saveSession({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      })

      return refreshed
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

function signOutAfterRefreshFailure() {
  clearSession()
  window.history.pushState({}, '', '/')
}

function friendlyStatusMessage(status: number, message: string) {
  if (status === 403) return message || 'You do not have access to this area.'
  if (status === 404) return message || 'This record was not found.'
  if (status === 409) return message || 'This change conflicts with an existing record.'
  return message
}

function headersWithAuth(init?: RequestInit) {
  const headers = new Headers(init?.headers)

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAccessToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

function getRetryAfter(response: Response) {
  const retryAfter = response.headers.get('Retry-After')

  if (!retryAfter) {
    return undefined
  }

  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds)) {
    return seconds
  }

  const retryDate = Date.parse(retryAfter)
  if (Number.isFinite(retryDate)) {
    return Math.max(0, Math.ceil((retryDate - Date.now()) / 1000))
  }

  return undefined
}

function createApiError(message: string, status?: number, details?: ProblemDetails) {
  const error = new Error(message) as ApiError
  error.status = status
  error.details = details
  return error
}

async function readPayload(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  const trimmed = text.trim()

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return text
    }
  }

  return text
}

export async function request<T>(
  path: string,
  init?: RequestInit,
  isRetry = false,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: headersWithAuth(init),
  })

  if (response.status === 429) {
    const retryAfter = getRetryAfter(response)
    const message = retryAfter
      ? `Too many requests. Try again in ${retryAfter} seconds.`
      : 'Too many requests. Try again shortly.'
    const error = createApiError(message, response.status)
    error.retryAfter = retryAfter
    throw error
  }

  if (response.status === 401 && !isRetry) {
    try {
      await getFreshTokens()
      return request<T>(path, init, true)
    } catch {
      signOutAfterRefreshFailure()
      throw new Error('Session expired or the tenant is suspended. Please sign in again or contact your administrator.')
    }
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await readPayload(response)

  if (!response.ok) {
    const details =
      typeof payload === 'object' && payload !== null
        ? (payload as ProblemDetails)
        : undefined

    const error = createApiError(
      friendlyStatusMessage(
        response.status,
        details
          ? problemMessage(details, `Request failed with status ${response.status}`)
          : String(payload),
      ),
      response.status,
      details,
    )
    throw error
  }

  return payload as T
}

export async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await readPayload(response)

  if (!response.ok) {
    const details =
      typeof payload === 'object' && payload !== null
        ? (payload as ProblemDetails)
        : undefined

    throw createApiError(
      friendlyStatusMessage(
        response.status,
        details
          ? problemMessage(details, `Request failed with status ${response.status}`)
          : String(payload),
      ),
      response.status,
      details,
    )
  }

  return payload as T
}

export async function downloadRequest(path: string, init?: RequestInit, isRetry = false): Promise<Blob> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: headersWithAuth({
      ...init,
      headers: {
        Accept: 'application/pdf',
        ...Object.fromEntries(new Headers(init?.headers).entries()),
      },
    }),
  })

  if (response.status === 401 && !isRetry) {
    try {
      await getFreshTokens()
      return downloadRequest(path, init, true)
    } catch {
      signOutAfterRefreshFailure()
      throw new Error('Session expired or the tenant is suspended. Please sign in again or contact your administrator.')
    }
  }

  if (!response.ok) {
    const payload = await readPayload(response)
    const details =
      typeof payload === 'object' && payload !== null
        ? (payload as ProblemDetails)
        : undefined

    throw createApiError(
      friendlyStatusMessage(
        response.status,
        details
          ? problemMessage(details, `Request failed with status ${response.status}`)
          : String(payload),
      ),
      response.status,
      details,
    )
  }

  return response.blob()
}
