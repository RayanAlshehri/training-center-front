import { type FormEvent, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { authApi } from '../services/authApi'
import type { ApiError } from '../types'

export function LoginPage() {
  const auth = useAuth()
  const [step, setStep] = useState<'login' | 'otp'>('login')
  const [challengeId, setChallengeId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authApi.login({ email, password })
      setChallengeId(result.challengeId)
      setStep('otp')
      setCode('')
    } catch (error) {
      const apiError = error as ApiError

      console.error('Login failed', {
        message: apiError.message,
        status: apiError.status,
        details: apiError.details,
      })
      setError(apiError.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const submitOtp = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authApi.verifyOtp({ challengeId, code })
      auth.setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      })
    } catch (error) {
      const apiError = error as ApiError
      setError(apiError.message || 'Invalid verification code.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={submitOtp}>
          <div>
            <p className="eyebrow">Two-factor verification</p>
            <h1>Enter verification code</h1>
            <p>Use the 6-digit code sent for {email}.</p>
          </div>

          {error && <div className="alert error">{error}</div>}

          <label className="control">
            <span>Code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying...' : 'Verify code'}
          </button>
          <button className="ghost-button" type="button" onClick={() => setStep('login')} disabled={loading}>
            Back to login
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submitLogin}>
        <div>
          <h1>Sign in</h1>
        </div>

        {error && <div className="alert error">{error}</div>}

        <label className="control">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="control">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Checking...' : 'Continue'}
        </button>
      </form>
    </main>
  )
}
