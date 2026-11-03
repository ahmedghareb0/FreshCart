import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../services/api'
import {
  changePassword,
  forgotPassword,
  resetPassword,
  verifyResetCode,
} from '../services/auth.service'
import { useAuth } from '../context/useAuth'
import { getRequestedPath } from '../utils/auth-routes'
import { ErrorMessage } from '../components/common/ErrorMessage'
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SignupRequest,
  VerifyResetCodeRequest,
} from '../types/auth'

function requestError(error: unknown): string {
  if (error instanceof ApiError) {
    return `The request failed (HTTP ${error.status}). Check the information and try again.`
  }
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

function AuthFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-card__description">{description}</p>
        {children}
        {footer && <div className="auth-card__footer">{footer}</div>}
      </div>
      <aside className="auth-aside" aria-label="FreshCart">
        <span className="brand__mark" aria-hidden="true">F</span>
        <p>Fresh finds for everyday living.</p>
        <span>Explore the FreshCart collection at your own pace.</span>
      </aside>
    </section>
  )
}

function AuthField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required = true,
}: {
  label: string
  name: string
  type?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
}) {
  return (
    <label className="auth-field" htmlFor={name}>
      <span>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
      />
    </label>
  )
}

function AuthForm({
  onSubmit,
  error,
  busy,
  submitLabel,
  children,
  success,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  error: string | null
  busy: boolean
  submitLabel: string
  children: ReactNode
  success?: string | null
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      {error && <ErrorMessage message={error} />}
      {success && <p className="auth-success" role="status">{success}</p>}
      {children}
      <button className="button button--solid auth-submit" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : submitLabel}
      </button>
    </form>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const state = location.state as unknown
  const accountCreated = typeof state === 'object' && state !== null &&
    'accountCreated' in state && state.accountCreated === true
  const passwordReset = typeof state === 'object' && state !== null &&
    'passwordReset' in state && state.passwordReset === true
  const sessionExpired = typeof state === 'object' && state !== null &&
    'sessionExpired' in state && state.sessionExpired === true

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login({ email: email.trim(), password }, rememberMe)
      navigate(getRequestedPath(state) ?? '/', { replace: true })
    } catch (cause) {
      setError(requestError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Sign in to FreshCart"
      description="Access your account to continue."
      footer={<>New to FreshCart? <Link to="/register">Create an account</Link></>}
    >
      <AuthForm
        onSubmit={submit}
        error={error ?? (
          sessionExpired
            ? 'Your session expired. Sign in again to continue.'
            : null
        )}
        busy={busy}
        submitLabel="Sign in"
        success={
          accountCreated
            ? 'Your account was created. Sign in to continue.'
            : passwordReset
              ? 'Your password was updated. Sign in with your new password.'
              : null
        }
      >
        <AuthField label="Email address" name="login-email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <AuthField label="Password" name="login-password" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
        <div className="auth-form__options">
          <label className="auth-checkbox">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            <span>Remember me</span>
          </label>
          <Link className="auth-text-link" to="/forgot-password">Forgot password?</Link>
        </div>
      </AuthForm>
    </AuthFrame>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fields, setFields] = useState<SignupRequest>({
    name: '',
    email: '',
    password: '',
    rePassword: '',
    phone: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof SignupRequest>(key: K, value: SignupRequest[K]) {
    setFields((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (fields.password !== fields.rePassword) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const hasSession = await register({ ...fields, name: fields.name.trim(), email: fields.email.trim(), phone: fields.phone.trim() })
      navigate(hasSession ? '/' : '/login', {
        replace: true,
        state: hasSession ? undefined : { accountCreated: true },
      })
    } catch (cause) {
      setError(requestError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="Join FreshCart"
      title="Create your account"
      description="A few details are all you need to get started."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <AuthForm onSubmit={submit} error={error} busy={busy} submitLabel="Create account">
        <AuthField label="Full name" name="register-name" autoComplete="name" value={fields.name} onChange={(value) => update('name', value)} />
        <AuthField label="Email address" name="register-email" type="email" autoComplete="email" value={fields.email} onChange={(value) => update('email', value)} />
        <AuthField label="Phone number" name="register-phone" type="tel" autoComplete="tel" value={fields.phone} onChange={(value) => update('phone', value)} />
        <AuthField label="Password" name="register-password" type="password" autoComplete="new-password" value={fields.password} onChange={(value) => update('password', value)} />
        <AuthField label="Confirm password" name="register-confirm-password" type="password" autoComplete="new-password" value={fields.rePassword} onChange={(value) => update('rePassword', value)} />
      </AuthForm>
    </AuthFrame>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await forgotPassword({ email: email.trim() } satisfies ForgotPasswordRequest)
      setSuccess('Request submitted. Follow the instructions provided by the service.')
    } catch (cause) {
      setError(requestError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="Account recovery"
      title="Forgot your password?"
      description="Enter your email to begin the password recovery process."
      footer={<>Remembered it? <Link to="/login">Back to sign in</Link></>}
    >
      <AuthForm onSubmit={submit} error={error} busy={busy} submitLabel="Send recovery request" success={success}>
        <AuthField label="Email address" name="forgot-email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        {success && <Link className="auth-text-link" to="/verify-reset-code">Enter your reset code</Link>}
      </AuthForm>
    </AuthFrame>
  )
}

export function VerifyResetCodePage() {
  const navigate = useNavigate()
  const [resetCode, setResetCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await verifyResetCode({ resetCode: resetCode.trim() } satisfies VerifyResetCodeRequest)
      setSuccess('Code accepted. Continue to set a new password.')
      navigate('/reset-password', { replace: true })
    } catch (cause) {
      setError(requestError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="Account recovery"
      title="Verify your reset code"
      description="Enter the code you received to continue."
      footer={<>Need to restart? <Link to="/forgot-password">Request another code</Link></>}
    >
      <AuthForm onSubmit={submit} error={error} busy={busy} submitLabel="Verify code" success={success}>
        <AuthField label="Reset code" name="reset-code" value={resetCode} onChange={setResetCode} autoComplete="one-time-code" />
      </AuthForm>
    </AuthFrame>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await resetPassword({ email: email.trim(), newPassword } satisfies ResetPasswordRequest)
      setSuccess('Password updated. You can now sign in with your new password.')
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch (cause) {
      setError(requestError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="Account recovery"
      title="Set a new password"
      description="Enter the account email and choose a new password."
      footer={<>Return to <Link to="/login">sign in</Link></>}
    >
      <AuthForm onSubmit={submit} error={error} busy={busy} submitLabel="Reset password" success={success}>
        <AuthField label="Email address" name="reset-email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <AuthField label="New password" name="reset-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} />
        <AuthField label="Confirm new password" name="reset-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
      </AuthForm>
    </AuthFrame>
  )
}

export function ChangePasswordPage() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const sessionExpiryHandledRef = useRef(false)
  const [fields, setFields] = useState<ChangePasswordRequest>({
    currentPassword: '',
    password: '',
    rePassword: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function update<K extends keyof ChangePasswordRequest>(key: K, value: ChangePasswordRequest[K]) {
    setFields((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (fields.password !== fields.rePassword) {
      setError('Passwords do not match.')
      return
    }
    if (!token) {
      setError('Your session is unavailable. Sign in again to continue.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await changePassword(token, fields)
      setFields({ currentPassword: '', password: '', rePassword: '' })
      setSuccess('Your password has been updated.')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        if (sessionExpiryHandledRef.current) {
          return
        }
        sessionExpiryHandledRef.current = true
        logout()
        navigate('/login', {
          replace: true,
          state: { sessionExpired: true },
        })
        return
      }
      setError(requestError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="Account security"
      title="Change your password"
      description="Choose a new password for your account."
    >
      <AuthForm onSubmit={submit} error={error} busy={busy} submitLabel="Update password" success={success}>
        <AuthField label="Current password" name="current-password" type="password" autoComplete="current-password" value={fields.currentPassword} onChange={(value) => update('currentPassword', value)} />
        <AuthField label="New password" name="change-new-password" type="password" autoComplete="new-password" value={fields.password} onChange={(value) => update('password', value)} />
        <AuthField label="Confirm new password" name="change-confirm-password" type="password" autoComplete="new-password" value={fields.rePassword} onChange={(value) => update('rePassword', value)} />
      </AuthForm>
    </AuthFrame>
  )
}
