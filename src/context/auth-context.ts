import { createContext } from 'react'
import type { AuthUser, SigninRequest, SignupRequest } from '../types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export type AuthContextValue = {
  user: AuthUser | null
  userId: string | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  status: AuthStatus
  error: string | null
  login: (input: SigninRequest, rememberMe: boolean) => Promise<void>
  register: (input: SignupRequest) => Promise<boolean>
  logout: () => void
  retryVerification: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
