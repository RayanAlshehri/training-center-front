import { request } from './request'
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../types/auth'

export const authApi = {
  login: (body: LoginRequest) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyOtp: (body: VerifyOtpRequest) =>
    request<VerifyOtpResponse>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  refresh: (refreshToken: string) =>
    request<RefreshTokenResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken: string) =>
    request<void>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: () => request<AuthUser>('/api/auth/me'),
}
