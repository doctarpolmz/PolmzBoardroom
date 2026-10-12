import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// ---------------------------------------------------------------------------
// AuthContext
// ---------------------------------------------------------------------------
// Centralised authentication state management for the entire application.
// Provides:
//   - Persistent session tracking via onAuthStateChange
//   - signUp / signIn methods that accept username *or* email + password
//   - signOut
//   - The current user object plus their profile row from public.profiles
// ---------------------------------------------------------------------------

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // -------------------------------------------------------------------------
  // Fetch the profile row for a given user id
  // -------------------------------------------------------------------------
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Auth] Error fetching profile:', error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Initialise session + subscribe to auth state changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      const { data: { session: activeSession } } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(activeSession)
      setUser(activeSession?.user ?? null)
      if (activeSession?.user) {
        await fetchProfile(activeSession.user.id)
      }
      setLoading(false)
    }

    getInitialSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return
        setSession(newSession)
        setUser(newSession?.user ?? null)
        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [fetchProfile])

  // -------------------------------------------------------------------------
  // signUp — accepts email, password, and an optional username.
  // The username is stored in raw_user_meta_data so the DB trigger
  // (handle_new_user) can insert it into public.profiles.
  // -------------------------------------------------------------------------
  const signUp = useCallback(async ({ email, password, username }) => {
    const options = {}
    if (username) {
      options.data = { username }
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      ...options,
    })
    return { data, error }
  }, [])

  // -------------------------------------------------------------------------
  // signIn — accepts a username *or* an email plus a password.
  // Supabase Auth only authenticates by email, so when the caller passes a
  // username we resolve it to the corresponding email via the profiles table
  // and then sign in with that email.
  // -------------------------------------------------------------------------
  const signIn = useCallback(async ({ identifier, password }) => {
    // If it looks like an email, sign in directly.
    const looksLikeEmail = identifier.includes('@')

    let email = identifier

    if (!looksLikeEmail) {
      // Treat identifier as a username → resolve to email
      const { data: profileRow, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', identifier)
        .single()

      if (lookupError || !profileRow) {
        return {
          data: null,
          error: { message: 'No account found with that username.' },
        }
      }
      email = profileRow.email
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }, [])

  // -------------------------------------------------------------------------
  // signOut
  // -------------------------------------------------------------------------
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    setProfile(null)
    return { error }
  }, [])

  // -------------------------------------------------------------------------
  // refreshProfile — re-fetch the current user's profile from the database.
  // Used after profile updates (e.g. saving the notice board) so the UI
  // reflects the change immediately.
  // -------------------------------------------------------------------------
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
