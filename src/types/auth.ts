export interface AuthUser {
  id: number
  fullName: string
  email: string
  role: string
  tenantId?: number | string | null
  permissions: string[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  requiresTwoFactor: boolean
  challengeId: string
  message: string
}

export interface VerifyOtpRequest {
  challengeId: string
  code: string
}

export interface VerifyOtpResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: AuthUser
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
}
