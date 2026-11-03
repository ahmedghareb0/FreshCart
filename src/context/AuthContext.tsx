import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError } from '../services/api'
import {
  signin as signinRequest,
  signup as signupRequest,
  getVerifiedAuthUser,
  verifyToken,
} from '../services/auth.service'
import { parseAuthSession } from '../services/auth-response'
import type { AuthUser, SigninRequest, SignupRequest } from '../types/auth'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

const TOKEN_KEY = 'freshcart-auth-token'

function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

function storeToken(token: string, rememberMe: boolean): void {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
}

function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

function getSessionTokenError(): Error {
  return new Error(
    'The authentication response did not include a usable session token.',
  )
}

function getSessionUserError(): Error {
  return new Error(
    'The authentication response did not include a valid user profile.',
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationAttempt, setVerificationAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) {
        return
      }

      let savedToken: string | null
      try {
        savedToken = readStoredToken()
      } catch {
        setError('Browser storage is unavailable; authentication cannot be restored.')
        setStatus('error')
        return
      }

      if (!savedToken) {
        setToken(null)
        setUser(null)
        setError(null)
        setStatus('unauthenticated')
        return
      }

      try {
        const response = await verifyToken(savedToken, controller.signal)
        if (controller.signal.aborted) {
          return
        }
        const verifiedUser = getVerifiedAuthUser(response)
        if (!verifiedUser) {
          setToken(savedToken)
          setUser(null)
          setError(
            'The saved session was not cleared, but the server did not return a valid user profile. Retry verification.',
          )
          setStatus('error')
          return
        }
        setToken(savedToken)
        setUser(verifiedUser)
        setError(null)
        setStatus('authenticated')
      } catch (cause: unknown) {
        if (controller.signal.aborted) {
          return
        }
        if (cause instanceof ApiError && cause.status === 401) {
          try {
            clearStoredToken()
          } catch {
            setError('The saved session is invalid and could not be cleared from browser storage.')
            setStatus('error')
            return
          }
          setToken(null)
          setUser(null)
          setError(null)
          setStatus('unauthenticated')
          return
        }
        setError(
          cause instanceof ApiError
            ? `Session verification failed (HTTP ${cause.status}). Retry to check your session.`
            : 'Could not verify the saved session. Check your connection and retry.',
        )
        setToken(savedToken)
        setUser(null)
        setStatus('error')
      }
    })

    return () => controller.abort()
  }, [verificationAttempt])

  const login = useCallback(
    async (input: SigninRequest, rememberMe: boolean) => {
      const response = await signinRequest(input)
      const session = parseAuthSession(response)
      if (session.kind === 'missing-token') {
        clearStoredToken()
        setToken(null)
        setUser(null)
        setError(null)
        setStatus('unauthenticated')
        throw getSessionTokenError()
      }
      if (session.kind === 'invalid-user') {
        clearStoredToken()
        setToken(null)
        setUser(null)
        setError(null)
        setStatus('unauthenticated')
        throw getSessionUserError()
      }

      storeToken(session.token, rememberMe)
      setToken(session.token)
      setUser(session.user)
      setError(null)
      setStatus('authenticated')
    },
    [],
  )

  const register = useCallback(async (input: SignupRequest) => {
    const response = await signupRequest(input)
    const session = parseAuthSession(response)
    if (session.kind === 'missing-token') {
      clearStoredToken()
      setToken(null)
      setUser(null)
      setError(null)
      setStatus('unauthenticated')
      return false
    }
    if (session.kind === 'invalid-user') {
      clearStoredToken()
      setToken(null)
      setUser(null)
      setError(null)
      setStatus('unauthenticated')
      throw getSessionUserError()
    }

    storeToken(session.token, true)
    setToken(session.token)
    setUser(session.user)
    setError(null)
    setStatus('authenticated')
    return true
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setToken(null)
    setUser(null)
    setError(null)
    setStatus('unauthenticated')
  }, [])

  const retryVerification = useCallback(() => {
    setVerificationAttempt((attempt) => attempt + 1)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userId: user?._id ?? null,
      token,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      status,
      error,
      login,
      register,
      logout,
      retryVerification,
    }),
    [user, token, status, error, login, register, logout, retryVerification],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
