import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

// ---------------------------------------------------------------------------
// ProtectedRoute
// ---------------------------------------------------------------------------
// Wraps routes that require an authenticated session. While the session is
// still loading we show a spinner; once loaded, unauthenticated users are
// redirected to the login page (preserving the intended destination).
// ---------------------------------------------------------------------------

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Spinner label="Verifying your session..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}
