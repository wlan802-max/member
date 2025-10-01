import { useState, useEffect } from 'react'
import { auth, User } from '@/lib/auth'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('useAuth: Starting auth check')
    // Get initial user
    auth.getCurrentUser()
      .then((user) => {
        console.log('useAuth: getCurrentUser resolved with user:', user?.email || 'null')
        setUser(user)
        setLoading(false)
      })
      .catch((error) => {
        console.error('useAuth: getCurrentUser failed:', error)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((user) => {
      console.log('useAuth: Auth state changed, user:', user?.email || 'null')
      setUser(user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await auth.signIn(email, password)
    return { data, error }
  }

  const signUp = async (email: string, password: string, userData: {
    first_name: string
    last_name: string
    organization_slug: string
  }) => {
    const { data, error } = await auth.signUp(email, password, userData)
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await auth.signOut()
    if (!error) {
      setUser(null)
    }
    return { error }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isAdmin: user?.profile?.role === 'admin' || user?.profile?.role === 'super_admin',
    isSuperAdmin: user?.profile?.role === 'super_admin'
  }
}