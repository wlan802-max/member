import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { SignupFormEnhanced } from './SignupFormEnhanced'
import { Mail, Lock, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signIn, signUp } = useAuth()
  const { organization, loading: tenantLoading } = useTenant()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      }
    } else {
      // Sign up mode
      if (!organization?.slug) {
        setError('Organization information is missing')
        setLoading(false)
        return
      }

      const { error } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        organization_slug: organization.slug
      })

      if (error) {
        setError(error.message)
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
            {mode === 'login' ? 'Sign in to your member account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
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

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ backgroundColor: organization?.primary_color }}
            >
              {loading 
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...') 
                : (mode === 'login' ? 'Sign In' : 'Sign Up')
              }
            </Button>
          </form>

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
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
