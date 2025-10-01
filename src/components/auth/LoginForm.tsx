import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { Mail, Lock, AlertCircle, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Organization {
  slug: string
  name: string
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOrgSelector, setShowOrgSelector] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string>('')

  const { signIn } = useAuth()
  const { organization, subdomain, loading: tenantLoading } = useTenant()

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('slug, name')
      .eq('is_active', true)
      .order('name')

    if (data && !error) {
      setOrganizations(data)
      if (subdomain) {
        setSelectedOrg(subdomain)
      }
    }
  }

  const handleOrgChange = (orgSlug: string) => {
    setSelectedOrg(orgSlug)
    const newUrl = `${window.location.origin}?org=${orgSlug}`
    window.location.href = newUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
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

  if (!organization && !showOrgSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Select Organization</CardTitle>
            <CardDescription>Choose your organization to sign in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {organizations.length === 0 ? (
                <div className="flex items-center justify-center space-x-2 text-gray-600 py-8">
                  <AlertCircle className="h-5 w-5" />
                  <span>Loading organizations...</span>
                </div>
              ) : (
                organizations.map((org) => (
                  <button
                    key={org.slug}
                    onClick={() => handleOrgChange(org.slug)}
                    className="w-full p-4 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors flex items-center space-x-3"
                  >
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-gray-500">@{org.slug}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
            Sign in to your member account
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a
                  href="#"
                  className="font-medium hover:underline"
                  style={{ color: organization?.primary_color }}
                >
                  Contact your administrator
                </a>
              </p>
            </div>

            {organizations.length > 1 && (
              <div className="pt-4 border-t">
                <button
                  onClick={() => setShowOrgSelector(true)}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center space-x-2 py-2"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Switch Organization</span>
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showOrgSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Switch Organization</CardTitle>
              <CardDescription>Choose a different organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org.slug}
                    onClick={() => handleOrgChange(org.slug)}
                    className={`w-full p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors flex items-center space-x-3 ${
                      org.slug === subdomain ? 'bg-blue-50 border-blue-500' : ''
                    }`}
                  >
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{org.name}</div>
                      <div className="text-xs text-gray-500">@{org.slug}</div>
                    </div>
                    {org.slug === subdomain && (
                      <span className="text-xs text-blue-600 font-medium">Current</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={() => setShowOrgSelector(false)}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
