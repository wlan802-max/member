import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { supabase } from '@/lib/supabase/client'
import { 
  CreditCard, 
  Calendar, 
  Mail, 
  User, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Smartphone,
  Download,
  Plus
} from 'lucide-react'

interface Membership {
  id: string
  membership_year: number
  start_date: string
  end_date: string
  status: string
  membership_type: string
  amount_paid: number | null
  payment_reference: string | null
}

export function MemberDashboard() {
  const { user } = useAuth()
  const { organization } = useTenant()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // For demo purposes, we'll create some mock data since Supabase isn't connected
    const mockMemberships: Membership[] = [
      {
        id: '1',
        membership_year: 2024,
        start_date: '2024-04-01',
        end_date: '2025-03-31',
        status: 'active',
        membership_type: 'standard',
        amount_paid: 50.00,
        payment_reference: 'PAY-2024-001'
      },
      {
        id: '2',
        membership_year: 2023,
        start_date: '2023-04-01',
        end_date: '2024-03-31',
        status: 'expired',
        membership_type: 'standard',
        amount_paid: 45.00,
        payment_reference: 'PAY-2023-001'
      }
    ]
    
    setTimeout(() => {
      setMemberships(mockMemberships)
      setLoading(false)
    }, 1000)
  }, [])

  const currentMembership = memberships.find(m => {
    const now = new Date()
    const endDate = new Date(m.end_date)
    return m.status === 'active' && endDate >= now
  })

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      expired: { variant: 'secondary' as const, icon: AlertCircle, color: 'text-red-600' },
      pending: { variant: 'outline' as const, icon: Clock, color: 'text-yellow-600' },
    }
    
    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getDaysUntilExpiry = (endDate: string) => {
    const now = new Date()
    const expiry = new Date(endDate)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.profile?.first_name || 'Member'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your membership and access your digital cards
        </p>
      </div>

      {/* Current Membership Status */}
      {currentMembership ? (
        <div className="mb-8">
          <Card className="border-l-4" style={{ borderLeftColor: organization?.primary_color || '#3B82F6' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Active Membership
                  </CardTitle>
                  <CardDescription>
                    Your {currentMembership.membership_type} membership for {currentMembership.membership_year}
                  </CardDescription>
                </div>
                {getStatusBadge(currentMembership.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Valid Until</p>
                  <p className="text-lg font-semibold">{formatDate(currentMembership.end_date)}</p>
                  <p className="text-xs text-gray-500">
                    {getDaysUntilExpiry(currentMembership.end_date)} days remaining
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Membership Type</p>
                  <p className="text-lg font-semibold capitalize">{currentMembership.membership_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Status</p>
                  <p className="text-lg font-semibold text-green-600">
                    {currentMembership.amount_paid ? `£${currentMembership.amount_paid}` : 'Paid'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mb-8">
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                No Active Membership
              </CardTitle>
              <CardDescription>
                You don't have an active membership for the current year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button style={{ backgroundColor: organization?.primary_color || '#3B82F6' }}>
                Renew Membership
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <CreditCard className="h-8 w-8 mx-auto mb-3" style={{ color: organization?.primary_color || '#3B82F6' }} />
            <h3 className="font-semibold mb-2">Digital Cards</h3>
            <p className="text-sm text-gray-600">Add to Google/Apple Wallet</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto mb-3" style={{ color: organization?.primary_color || '#3B82F6' }} />
            <h3 className="font-semibold mb-2">Profile</h3>
            <p className="text-sm text-gray-600">Update your information</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-3" style={{ color: organization?.primary_color || '#3B82F6' }} />
            <h3 className="font-semibold mb-2">Events</h3>
            <p className="text-sm text-gray-600">View upcoming events</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 mx-auto mb-3" style={{ color: organization?.primary_color || '#3B82F6' }} />
            <h3 className="font-semibold mb-2">Messages</h3>
            <p className="text-sm text-gray-600">Organization updates</p>
          </CardContent>
        </Card>
      </div>

      {/* Digital Membership Cards */}
      {currentMembership && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Digital Membership Cards
            </CardTitle>
            <CardDescription>
              Add your membership card to your mobile wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium">Google Wallet</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Add your membership card to Google Wallet for easy access on Android devices.
                </p>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Google Wallet
                </Button>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-gray-800" />
                  <h3 className="font-medium">Apple Wallet</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Download your membership pass for Apple Wallet on iOS devices.
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download for Apple Wallet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membership History */}
      <Card>
        <CardHeader>
          <CardTitle>Membership History</CardTitle>
          <CardDescription>
            View your past and current memberships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {memberships.map((membership) => (
              <div key={membership.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">
                      {membership.membership_year} Membership
                    </h3>
                    {getStatusBadge(membership.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatDate(membership.start_date)} - {formatDate(membership.end_date)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Type: {membership.membership_type} • 
                    {membership.amount_paid && ` Amount: £${membership.amount_paid}`}
                    {membership.payment_reference && ` • Ref: ${membership.payment_reference}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {membership.status === 'active' && (
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}