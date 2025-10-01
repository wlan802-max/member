import React from 'react'
import { Header } from './components/layout/Header'
import { LoginForm } from './components/auth/LoginForm'
import { MemberDashboard } from './components/dashboard/MemberDashboard'
import { SuperAdminLayout } from './components/admin/SuperAdminLayout'
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard'
import { SuperAdminAuth } from './components/admin/SuperAdminAuth'
import { useAuth } from './hooks/useAuth'
import { useTenant } from './hooks/useTenant'

function App() {
  const { user, loading: authLoading } = useAuth()
  const { organization, loading: tenantLoading, error: tenantError, isSuperAdmin } = useTenant()

  // Show loading state while checking auth and tenant
  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Handle Super Admin Portal
  if (isSuperAdmin) {
    console.log('Super admin portal detected, user:', user)
    if (!user) {
      console.log('No user, showing super admin auth')
      return <SuperAdminAuth />
    }
    
    // Check if user is actually a super admin
    console.log('User profile role:', user.profile?.role)
    if (user.profile?.role !== 'super_admin') {
      console.log('User is not super admin, showing access denied')
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-600 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don't have super admin privileges to access this portal.
            </p>
          </div>
        </div>
      )
    }
    
    console.log('Showing super admin dashboard')
    return (
      <SuperAdminLayout>
        <SuperAdminDashboard />
      </SuperAdminLayout>
    )
  }

  // Show login form if not authenticated
  // LoginForm will handle showing organization selector if no org is selected
  if (!user) {
    return <LoginForm />
  }

  // If authenticated but no organization, show error
  if (!organization) {
    console.log('Authenticated user but no organization found')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Organization Not Found</h1>
          <p className="text-gray-600 mb-4">
            The organization for this subdomain could not be found or is not active.
          </p>
          <p className="text-sm text-gray-500">
            Please check the URL or contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  // Show main application
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <MemberDashboard />
      </main>
    </div>
  )
}

export default App