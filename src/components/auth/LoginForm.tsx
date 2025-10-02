import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { SignupFormEnhanced } from './SignupFormEnhanced'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState(false)

  const { signIn } = useAuth()
  const { organization, loading: tenantLoading } = useTenant()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResetSuccess(false)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      }
    } else if (mode === 'reset') {
      // Password reset mode
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setResetSuccess(true)
      }
    }

    setLoading(false)
  }

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <span>Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Organization Not Found</CardTitle>
            <CardDescription>Please use your organization's unique login URL</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                Each organization has its own login page. Please use one of these methods:
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="font-medium text-blue-900">Option 1: Subdomain</p>
                <code className="block bg-white p-2 rounded text-xs">
                  https://yourorg.member.ringing.org.uk
                </code>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="font-medium text-blue-900">Option 2: URL Parameter</p>
                <code className="block bg-white p-2 rounded text-xs">
                  {window.location.origin}?org=yourorg
                </code>
              </div>
              <p className="text-xs text-gray-500 pt-2">
                Contact your organization administrator if you don't have the correct URL.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (mode === 'signup') {
    return (
      <SignupFormEnhanced
        organizationId={organization.id}
        organizationName={organization.name}
        organizationSlug={organization.slug}
        logoUrl={organization.logo_url}
        primaryColor={organization.primary_color}
        onBackToLogin={() => setMode('login')}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {organization?.logo_url && (
            <div className="flex justify-center mb-4">
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            </div>
          )}
          <CardTitle className="text-2xl" style={{ color: organization?.primary_color }}>
            {organization?.name}
          </CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Sign in to your member account' : mode === 'reset' ? 'Reset your password' : 'Create a new account'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === 'reset' && resetSuccess ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Check your email!</strong> We've sent you a password reset link. Click the link in the email to set a new password.
                </p>
              </div>
              <Button
                onClick={() => {
                  setMode('login')
                  setResetSuccess(false)
                  setEmail('')
                }}
                className="w-full"
                variant="outline"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ backgroundColor: organization?.primary_color }}
              data-testid={mode === 'reset' ? 'button-send-reset-link' : mode === 'login' ? 'button-sign-in' : 'button-sign-up'}
            >
              {loading 
                ? (mode === 'login' ? 'Signing in...' : mode === 'reset' ? 'Sending...' : 'Creating account...') 
                : (mode === 'login' ? 'Sign In' : mode === 'reset' ? 'Send Reset Link' : 'Sign Up')
              }
            </Button>
          </form>
          )}

          {mode === 'login' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setMode('reset')
                  setError(null)
                }}
                className="text-sm hover:underline"
                style={{ color: organization?.primary_color }}
                data-testid="link-forgot-password"
              >
                Forgot password?
              </button>
            </div>
          )}

          {mode !== 'reset' && (
            <div className="mt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        onClick={() => {
                          setMode('signup')
                          setError(null)
                        }}
                        className="font-medium hover:underline"
                        style={{ color: organization?.primary_color }}
                        data-testid="link-sign-up"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        onClick={() => {
                          setMode('login')
                          setError(null)
                        }}
                        className="font-medium hover:underline"
                        style={{ color: organization?.primary_color }}
                        data-testid="link-sign-in"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {mode === 'reset' && !resetSuccess && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
                className="text-sm hover:underline"
                style={{ color: organization?.primary_color }}
                data-testid="link-back-to-login"
              >
                Back to login
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
