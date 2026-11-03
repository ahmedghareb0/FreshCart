import { apiRequest } from './api'
import type {
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SigninRequest,
  SignupRequest,
  UpdateUserRequest,
  VerifyResetCodeRequest,
} from '../types/auth'

export { getAuthUser, getVerifiedAuthUser } from './auth-response'

export function signup(input: SignupRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('auth/signup', {
    method: 'POST',
    body: input,
  })
}

export function signin(input: SigninRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('auth/signin', {
    method: 'POST',
    body: input,
  })
}

export function forgotPassword(
  input: ForgotPasswordRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('auth/forgotPasswords', {
    method: 'POST',
    body: input,
  })
}

export function verifyResetCode(
  input: VerifyResetCodeRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('auth/verifyResetCode', {
    method: 'POST',
    body: input,
  })
}

export function resetPassword(
  input: ResetPasswordRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('auth/resetPassword', {
    method: 'PUT',
    body: input,
  })
}

export function changePassword(
  token: string,
  input: ChangePasswordRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('users/changeMyPassword', {
    method: 'PUT',
    token,
    body: input,
  })
}

export function verifyToken(
  token: string,
  signal?: AbortSignal,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('auth/verifyToken', { token, signal })
}

export function updateUser(
  token: string,
  input: UpdateUserRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('users/updateMe/', {
    method: 'PUT',
    token,
    body: input,
  })
}
