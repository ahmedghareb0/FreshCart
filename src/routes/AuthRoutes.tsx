import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { Loading } from '../components/common/Loading'
import { useAuth } from '../context/useAuth'
import { getRequestedPath } from '../utils/auth-routes'

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) {
    return <Loading />
  }
  return isAuthenticated
    ? <Navigate to={getRequestedPath(location.state) ?? '/'} replace />
    : <Outlet />
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, status, error, retryVerification } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <Loading />
  }
  if (status === 'error') {
    return (
      <section className="auth-verification-error" aria-label="Session verification">
        <ErrorMessage message={error ?? 'Your session could not be verified.'} />
        <button className="button button--outline" type="button" onClick={retryVerification}>
          Retry verification
        </button>
        <Link className="auth-text-link" to="/login" state={{ from: location }}>
          Sign in again
        </Link>
      </section>
    )
  }
  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location }} />
}
