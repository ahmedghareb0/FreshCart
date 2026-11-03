export type SignupRequest = {
  name: string
  email: string
  password: string
  rePassword: string
  phone: string
}

export type SigninRequest = {
  email: string
  password: string
}

export type ForgotPasswordRequest = {
  email: string
}

export type VerifyResetCodeRequest = {
  resetCode: string
}

export type ResetPasswordRequest = {
  email: string
  newPassword: string
}

export type ChangePasswordRequest = {
  currentPassword: string
  password: string
  rePassword: string
}

export type UpdateUserRequest = {
  name: string
  email: string
  phone: string
}

export type AuthResponse = unknown
export type AuthProfile = {
  name: string
  email: string
  role: string
  _id?: string
  [key: string]: unknown
}

export type AuthUser = {
  _id?: string
  name?: string
  email?: string
  role?: string
  [key: string]: unknown
}
