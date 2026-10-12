import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Spinner from './components/Spinner'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Workspace from './pages/Workspace'
import Settings from './pages/Settings'

// ---------------------------------------------------------------------------
// Layout wrapper — renders the Navbar on all non-auth pages. Login and Signup
// pages render their own full-screen layouts so we suppress the navbar there.
// ---------------------------------------------------------------------------
function Layout({ children }) {
  const location = useLocation()
  const hideNavbarPaths = ['/login', '/signup']
  const hideNavbar = hideNavbarPaths.includes(location.pathname)

  return (
    <div className="min-h-screen bg-slate-900">
      {!hideNavbar && <Navbar />}
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root component that routes between pages once the auth state is settled.
// ---------------------------------------------------------------------------
function AppRoutes() {
  const { loading } = useAuth()

  // While the initial session is being resolved, show a loading screen so we
  // don't flash a login redirect on a protected route.
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Spinner label="Loading Polmz Boardroom..." />
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/workspace/:username" element={<Workspace />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

// ---------------------------------------------------------------------------
// App root — wraps everything in the Router and AuthProvider.
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
