import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { supabase } from '@/lib/supabase/client'
import DOMPurify from 'dompurify'
import { toast } from 'sonner'
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
  Plus,
  X,
  Loader2,
  Users,
  UserPlus
} from 'lucide-react'
import { FormBuilder } from '@/components/admin/FormBuilder'
import { MembershipTypesEditor } from '@/components/admin/MembershipTypesEditor'
import { EmailWorkflowsManager } from '@/components/admin/EmailWorkflowsManager'
import { DynamicFormRenderer } from '@/components/forms/DynamicFormRenderer'
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

// Utility function for date formatting
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

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
  const { user, isAdmin } = useAuth()
  const { organization } = useTenant()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'dashboard' | 'profile' | 'events' | 'messages' | 'subscriptions' | 'committees' | 'badges' | 'admin-members' | 'admin-settings' | 'admin-mailing' | 'admin-forms' | 'admin-memberships' | 'admin-workflows' | 'admin-event-registrations' | 'admin-committees' | 'admin-analytics' | 'admin-badges' | 'admin-reminders'>('dashboard')
  const [showRenewalModal, setShowRenewalModal] = useState(false)

  useEffect(() => {
    // Check URL hash for navigation
    const hash = window.location.hash.replace('#', '')
    if (hash === 'admin' && isAdmin) {
      setActiveView('admin-members')
      window.location.hash = '' // Clear hash after navigation
    }
  }, [isAdmin])

  useEffect(() => {
    const fetchMemberships = async () => {
      if (!user?.profile?.id || !organization?.id) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('memberships')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('profile_id', user.profile.id)
          .order('membership_year', { ascending: false })

        if (error) {
          console.error('Error fetching memberships:', error)
          toast.error('Failed to load memberships', {
            description: error.message
          })
          setMemberships([])
        } else {
          setMemberships(data || [])
          if (data && data.length > 0) {
            toast.success('Memberships loaded')
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching memberships:', err)
        toast.error('Failed to load memberships')
        setMemberships([])
      } finally {
        setLoading(false)
      }
    }

    fetchMemberships()
  }, [user, organization])

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

      {/* Tab Navigation */}
      {(isAdmin || activeView !== 'dashboard') && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeView === 'dashboard'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="tab-dashboard"
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView('subscriptions')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeView === 'subscriptions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="tab-subscriptions"
            >
              Mailing Lists
            </button>
            <button
              onClick={() => setActiveView('committees')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeView === 'committees'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="tab-committees"
            >
              Committees
            </button>
            <button
              onClick={() => setActiveView('badges')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeView === 'badges'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="tab-badges"
            >
              Badges
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveView('admin-members')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-members'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-members"
                >
                  Members
                </button>
                <button
                  onClick={() => setActiveView('admin-settings')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-settings'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-settings"
                >
                  Organization Settings
                </button>
                <button
                  onClick={() => setActiveView('admin-mailing')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-mailing'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-mailing"
                >
                  Mailing List
                </button>
                <button
                  onClick={() => setActiveView('admin-memberships')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-memberships'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-memberships"
                >
                  Membership Types
                </button>
                <button
                  onClick={() => setActiveView('admin-forms')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-forms'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-forms"
                >
                  Signup Forms
                </button>
                <button
                  onClick={() => setActiveView('admin-workflows')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-workflows'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-workflows"
                >
                  Email Workflows
                </button>
                <button
                  onClick={() => setActiveView('admin-event-registrations')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-event-registrations'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-event-registrations"
                >
                  Event Registrations
                </button>
                <button
                  onClick={() => setActiveView('admin-committees')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-committees'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-admin-committees"
                >
                  Committees Management
                </button>
                <button
                  onClick={() => setActiveView('admin-analytics')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-analytics'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-analytics"
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveView('admin-badges')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-badges'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-admin-badges"
                >
                  Badges Management
                </button>
                <button
                  onClick={() => setActiveView('admin-reminders')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'admin-reminders'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="tab-reminders"
                >
                  Automated Reminders
                </button>
              </>
            )}
          </nav>
        </div>
      )}

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div>
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
              <Button 
                disabled={!organization?.renewal_enabled}
                onClick={() => setShowRenewalModal(true)}
                data-testid="button-renew-membership"
                style={{ backgroundColor: organization?.primary_color || '#3B82F6' }}
                title={organization?.renewal_enabled ? "Renew your membership" : "Renewal not available"}
              >
                Renew Membership
              </Button>
              {organization?.renewal_enabled ? (
                <p className="text-sm text-gray-600 mt-2">Click to renew your membership for the next year</p>
              ) : (
                <p className="text-sm text-gray-600 mt-2">Membership renewal is currently disabled</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card 
          className="hover:shadow-md transition-shadow opacity-60"
          data-testid="card-digital-cards"
          title="Digital cards feature coming soon"
        >
          <CardContent className="p-6 text-center">
            <CreditCard className="h-8 w-8 mx-auto mb-3" style={{ color: organization?.primary_color || '#3B82F6' }} />
            <h3 className="font-semibold mb-2">Digital Cards</h3>
            <p className="text-sm text-gray-600">Add to Google/Apple Wallet</p>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveView('profile')}
          data-testid="card-profile"
        >
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto mb-3" style={{ color: organization?.primary_color || '#3B82F6' }} />
            <h3 className="font-semibold mb-2">Profile</h3>
            <p className="text-sm text-gray-600">Update your information</p>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveView('events')}
          data-testid="card-events"
        >
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-3" style={{ color: organization?.primary_color || '#3B82F6' }} />
            <h3 className="font-semibold mb-2">Events</h3>
            <p className="text-sm text-gray-600">View upcoming events</p>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveView('messages')}
          data-testid="card-messages"
        >
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
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled
                  title="Google Wallet integration coming soon"
                  data-testid="button-add-google-wallet"
                >
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
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled
                  title="Apple Wallet integration coming soon"
                  data-testid="button-download-apple-wallet"
                >
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
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled
                      title="Membership details coming soon"
                      data-testid={`button-view-details-${membership.id}`}
                    >
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
      )}

      {/* Profile View */}
      {activeView === 'profile' && user && (
        <ProfileView user={user} organization={organization} onBack={() => setActiveView('dashboard')} />
      )}

      {/* Events View */}
      {activeView === 'events' && organization && user?.profile?.id && (
        <EventsView organizationId={organization.id} profileId={user.profile.id} onBack={() => setActiveView('dashboard')} />
      )}

      {/* Messages View */}
      {activeView === 'messages' && organization && (
        <MessagesView organizationId={organization.id} onBack={() => setActiveView('dashboard')} />
      )}

      {/* Subscriptions View - For all members */}
      {activeView === 'subscriptions' && organization && user?.email && (
        <SubscriptionsView organizationId={organization.id} userEmail={user.email} />
      )}

      {/* Admin - Members View */}
      {activeView === 'admin-members' && isAdmin && (
        <MembersAdminView organizationId={organization?.id || ''} />
      )}

      {/* Admin - Settings View */}
      {activeView === 'admin-settings' && isAdmin && organization && (
        <SettingsAdminView organization={organization} />
      )}

      {/* Admin - Mailing List View */}
      {activeView === 'admin-mailing' && isAdmin && organization && (
        <MailingAdminView organizationId={organization.id} />
      )}

      {/* Admin - Membership Types View */}
      {activeView === 'admin-memberships' && isAdmin && organization && (
        <MembershipTypesEditor organizationId={organization.id} />
      )}

      {/* Admin - Signup Forms View */}
      {activeView === 'admin-forms' && isAdmin && organization && (
        <FormBuilder organizationId={organization.id} />
      )}

      {/* Admin - Email Workflows View */}
      {activeView === 'admin-workflows' && isAdmin && organization && (
        <EmailWorkflowsManager organizationId={organization.id} />
      )}

      {/* Admin - Event Registrations View */}
      {activeView === 'admin-event-registrations' && isAdmin && organization && (
        <AdminEventRegistrationsView organizationId={organization.id} />
      )}

      {/* Member - Committees View */}
      {activeView === 'committees' && organization && user?.profile?.id && (
        <MemberCommitteesView organizationId={organization.id} profileId={user.profile.id} />
      )}

      {/* Admin - Committees Management View */}
      {activeView === 'admin-committees' && isAdmin && organization && (
        <AdminCommitteesView organizationId={organization.id} />
      )}

      {/* Admin - Analytics View */}
      {activeView === 'admin-analytics' && isAdmin && organization && (
        <AnalyticsView organizationId={organization.id} primaryColor={organization.primary_color} />
      )}

      {/* Member - Badges View */}
      {activeView === 'badges' && organization && user?.profile?.id && (
        <MemberBadgesView organizationId={organization.id} profileId={user.profile.id} />
      )}

      {/* Admin - Badges Management View */}
      {activeView === 'admin-badges' && isAdmin && organization && (
        <AdminBadgesView organizationId={organization.id} />
      )}

      {/* Admin - Automated Reminders View */}
      {activeView === 'admin-reminders' && isAdmin && organization && (
        <AdminRemindersView organizationId={organization.id} />
      )}

      {/* Renewal Modal */}
      {showRenewalModal && organization && user?.profile && (
        <RenewalModal
          organizationId={organization.id}
          organizationName={organization.name}
          organizationSlug={organization.slug}
          profileId={user.profile.id}
          profileEmail={user.email}
          profileFirstName={user.profile.first_name}
          profileLastName={user.profile.last_name}
          renewalFormSchemaId={organization.renewal_form_schema_id}
          logoUrl={organization.logo_url}
          primaryColor={organization.primary_color}
          onClose={() => setShowRenewalModal(false)}
          onSuccess={() => {
            setShowRenewalModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  )
}

// Renewal Modal Component
interface RenewalModalProps {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  profileId: string;
  profileEmail: string;
  profileFirstName: string;
  profileLastName: string;
  renewalFormSchemaId: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function RenewalModal({
  organizationId,
  organizationName: _organizationName,
  organizationSlug: _organizationSlug,
  profileId,
  profileEmail,
  profileFirstName,
  profileLastName,
  renewalFormSchemaId,
  logoUrl: _logoUrl,
  primaryColor: _primaryColor,
  onClose,
  onSuccess
}: RenewalModalProps) {
  const [formSchema, setFormSchema] = useState<any>(null);
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [schemaVersion, setSchemaVersion] = useState<number | null>(null);
  const [membershipTypes, setMembershipTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRenewalForm();
  }, [organizationId, renewalFormSchemaId]);

  const loadRenewalForm = async () => {
    try {
      setLoading(true);

      // Load the renewal form (or default signup form if no dedicated renewal form)
      const formQuery = renewalFormSchemaId
        ? supabase.from('organization_form_schemas').select('*').eq('id', renewalFormSchemaId).eq('is_active', true).maybeSingle()
        : supabase.from('organization_form_schemas').select('*').eq('organization_id', organizationId).eq('is_active', true).in('form_type', ['signup', 'both']).maybeSingle();

      const { data: formData, error: formError } = await formQuery;

      if (formError) throw formError;

      if (!formData) {
        setError('No renewal form configured. Please contact an administrator.');
        setLoading(false);
        return;
      }

      setFormSchema(formData.schema_data);
      setSchemaId(formData.id);
      setSchemaVersion(formData.schema_version);

      // Load membership types
      const { data: typesData, error: typesError } = await supabase
        .from('organization_membership_types')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order');

      if (typesError) throw typesError;

      setMembershipTypes(
        typesData.map((mt) => ({
          id: mt.id,
          code: mt.code,
          name: mt.name,
          description: mt.description || undefined,
          price: parseFloat(mt.price),
          is_default: mt.is_default,
          is_active: mt.is_active,
          display_order: mt.display_order
        }))
      );

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading renewal form:', err);
      setError('Failed to load renewal form. Please try again.');
      setLoading(false);
    }
  };

  const handleRenewalSubmit = async (submittedData: { formData: any; selectedMemberships: string[]; totalAmount: number }) => {
    const { formData, selectedMemberships, totalAmount } = submittedData;

    if (selectedMemberships.length === 0) {
      toast.error('Please select at least one membership type');
      return;
    }

    try {
      // Get current membership year
      const { data: yearData, error: yearError } = await supabase
        .rpc('get_current_membership_year', { org_id: organizationId });

      if (yearError) {
        console.error('Error getting membership year:', yearError);
        toast.error('Failed to determine membership year.');
        return;
      }

      const membershipYear = typeof yearData === 'number' ? yearData : new Date().getFullYear();

      // Create membership records for each selected type
      const membershipRecords = selectedMemberships.map(typeId => ({
        profile_id: profileId,
        organization_id: organizationId,
        membership_type_id: typeId,
        membership_year: membershipYear,
        status: 'pending',
        amount_paid: 0.00
      }));

      const { error: membershipError } = await supabase
        .from('memberships')
        .insert(membershipRecords);

      if (membershipError) {
        console.error('Error creating membership records:', membershipError);
        toast.error('Failed to create membership records. Please contact an administrator.');
        return;
      }

      // Save form response
      const { error: responseError } = await supabase
        .from('profile_form_responses')
        .insert({
          profile_id: profileId,
          organization_id: organizationId,
          schema_id: schemaId,
          schema_version: schemaVersion,
          response_data: formData,
          selected_membership_types: selectedMemberships,
          total_amount: totalAmount
        });

      if (responseError) {
        console.error('Error saving form response:', responseError);
        // Don't fail renewal if form response fails
      }

      // Trigger email workflows for renewal
      try {
        const { data: workflows, error: workflowError } = await supabase
          .from('email_workflows')
          .select('*')
          .eq('organization_id', organizationId)
          .in('trigger_event', ['renewal', 'both'])
          .eq('is_active', true);

        if (!workflowError && workflows && workflows.length > 0) {
          const membershipTypeNames = selectedMemberships
            .map(typeId => membershipTypes.find(mt => mt.id === typeId)?.name || typeId)
            .join(', ');

          for (const workflow of workflows) {
            try {
              if (!workflow.email_subject || !workflow.email_template) continue;

              let subject = workflow.email_subject
                .replace(/\{\{first_name\}\}/g, profileFirstName)
                .replace(/\{\{last_name\}\}/g, profileLastName)
                .replace(/\{\{email\}\}/g, profileEmail)
                .replace(/\{\{membership_type\}\}/g, membershipTypeNames);
              
              let template = workflow.email_template
                .replace(/\{\{first_name\}\}/g, profileFirstName)
                .replace(/\{\{last_name\}\}/g, profileLastName)
                .replace(/\{\{email\}\}/g, profileEmail)
                .replace(/\{\{membership_type\}\}/g, membershipTypeNames);

              // Send email via backend
              const response = await fetch('/api/send-workflow-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: workflow.recipient_email,
                  recipientName: workflow.recipient_name,
                  subject,
                  htmlBody: template,
                  textBody: template,
                  workflowId: workflow.id,
                  organizationId
                }),
              });

              if (response.ok) {
                console.log('Renewal email sent');
              }
            } catch (err) {
              console.error('Error sending renewal email:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error triggering email workflows:', err);
      }

      toast.success('Renewal successful! Awaiting admin approval.');
      onSuccess();
    } catch (err) {
      console.error('Renewal error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Renew Membership</h2>
              <p className="text-gray-600 mt-1">Complete the form to renew your membership for the next year</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" data-testid="button-close-renewal">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2">Loading renewal form...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && formSchema && (
            <DynamicFormRenderer
              schema={formSchema}
              membershipTypes={membershipTypes}
              onSubmit={handleRenewalSubmit}
              submitLabel="Submit Renewal"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Members Admin View Component
interface MembersAdminViewProps {
  organizationId: string;
}

function MembersAdminView({ organizationId }: MembersAdminViewProps) {
  const [memberTab, setMemberTab] = useState<'active' | 'pending'>('active');
  const [members, setMembers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showEditMember, setShowEditMember] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchPendingUsers();
  }, [organizationId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    }
  };

  const handleToggleActive = async (memberId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', memberId);

      if (error) throw error;
      await fetchMembers();
    } catch (error) {
      console.error('Error toggling member status:', error);
    }
  };

  const handleApproveUser = async (userId: string, role: 'member' | 'admin' = 'member') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'active',
          is_active: true,
          role: role,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User approved successfully');
      await fetchMembers();
      await fetchPendingUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleRejectUser = async (userId: string, reason: string = '') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'rejected',
          is_active: false,
          rejection_note: reason,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User rejected');
      await fetchPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading members...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Members Management</CardTitle>
            <CardDescription>Manage organization members and their access</CardDescription>
          </div>
          <Button onClick={() => setShowAddMember(true)} data-testid="button-add-member">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Sub-tabs for Active/Pending */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setMemberTab('active')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                memberTab === 'active'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="tab-active-members"
            >
              Active Members ({members.length})
            </button>
            <button
              onClick={() => setMemberTab('pending')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                memberTab === 'pending'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="tab-pending-users"
            >
              Pending Approval ({pendingUsers.length})
            </button>
          </nav>
        </div>

        {/* Active Members List */}
        {memberTab === 'active' && (
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`member-row-${member.id}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{member.first_name} {member.last_name}</h3>
                    <Badge variant={member.is_active ? 'default' : 'secondary'}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{member.email}</p>
                  {member.phone && <p className="text-xs text-gray-500">{member.phone}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedMember(member);
                      setShowEditMember(true);
                    }}
                    data-testid={`button-edit-member-${member.id}`}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant={member.is_active ? 'outline' : 'default'}
                    onClick={() => handleToggleActive(member.id, member.is_active)}
                    data-testid={`button-toggle-member-${member.id}`}
                  >
                    {member.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-center text-gray-500 py-8">No active members found</p>
            )}
          </div>
        )}

        {/* Pending Users List */}
        {memberTab === 'pending' && (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50" data-testid={`pending-user-row-${user.id}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{user.first_name} {user.last_name}</h3>
                    <Badge variant="outline" className="bg-yellow-100">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending Approval
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Signed up: {formatDate(user.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => handleApproveUser(user.id, 'member')}
                    data-testid={`button-approve-user-${user.id}`}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve as Member
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleApproveUser(user.id, 'admin')}
                    data-testid={`button-approve-admin-${user.id}`}
                  >
                    Approve as Admin
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleRejectUser(user.id, 'Rejected by admin')}
                    data-testid={`button-reject-user-${user.id}`}
                  >
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
            {pendingUsers.length === 0 && (
              <p className="text-center text-gray-500 py-8">No pending users</p>
            )}
          </div>
        )}
      </CardContent>

      {showAddMember && (
        <AddMemberModal
          organizationId={organizationId}
          onClose={() => setShowAddMember(false)}
          onSuccess={() => {
            setShowAddMember(false);
            fetchMembers();
          }}
        />
      )}

      {showEditMember && selectedMember && (
        <EditMemberModal
          member={selectedMember}
          onClose={() => {
            setShowEditMember(false);
            setSelectedMember(null);
          }}
          onSuccess={() => {
            setShowEditMember(false);
            setSelectedMember(null);
            fetchMembers();
          }}
        />
      )}
    </Card>
  );
}

// Custom Domains Manager Component
interface CustomDomain {
  id: string;
  domain: string;
  verification_status: 'pending' | 'verified' | 'failed';
  verification_token: string;
  is_primary: boolean;
  ssl_status: 'pending' | 'issued' | 'failed' | 'expired';
  verified_at: string | null;
  created_at: string;
}

interface CustomDomainsManagerProps {
  organizationId: string;
}

function CustomDomainsManager({ organizationId }: CustomDomainsManagerProps) {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load domains
  const loadDomains = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_domains')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load custom domains');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, [organizationId]);

  const handleVerifyDomain = async (domainId: string, domain: string) => {
    try {
      // Get user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in again to verify domains');
        return;
      }

      toast.info('Checking DNS records...');

      const response = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ domain, domainId, organizationId })
      });

      const result = await response.json();

      if (result.verified) {
        toast.success('Domain verified successfully!');
        loadDomains();
      } else {
        toast.error(result.message || 'Domain verification failed');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Failed to verify domain');
    }
  };

  const handleDeleteDomain = async (domainId: string, domain: string) => {
    if (!confirm(`Are you sure you want to delete ${domain}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      toast.success('Domain deleted successfully');
      loadDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast.error('Failed to delete domain');
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('organization_domains')
        .update({ is_primary: true })
        .eq('id', domainId);

      if (error) throw error;

      toast.success('Primary domain updated');
      loadDomains();
    } catch (error) {
      console.error('Error setting primary domain:', error);
      toast.error('Failed to set primary domain');
    }
  };

  const handleGenerateSSL = async (domain: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in again to generate SSL');
        return;
      }

      toast.info('Generating SSL certificate... This may take a minute.');

      const response = await fetch('/api/domains/ssl/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ domain, organizationId })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('SSL certificate generated successfully!');
        loadDomains();
      } else {
        toast.error(result.error || result.message || 'SSL generation failed');
      }
    } catch (error) {
      console.error('Error generating SSL:', error);
      toast.error('Failed to generate SSL certificate');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Custom Domains</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Custom Domains</h3>
          <p className="text-sm text-gray-500">Use your own domain name for your organization</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} data-testid="button-add-domain">
          <Plus className="w-4 h-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {domains.length === 0 ? (
        <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center">
          <p className="text-gray-500">No custom domains configured</p>
          <p className="text-sm text-gray-400 mt-1">Add a custom domain to use your own URL</p>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <div key={domain.id} className="p-4 border rounded-lg space-y-3" data-testid={`domain-${domain.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{domain.domain}</span>
                  {domain.is_primary && (
                    <Badge className="bg-blue-100 text-blue-800">Primary</Badge>
                  )}
                  <Badge className={
                    domain.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                    domain.verification_status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  } data-testid={`status-${domain.id}`}>
                    {domain.verification_status === 'verified' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                    {domain.verification_status === 'failed' && <X className="w-3 h-3 inline mr-1" />}
                    {domain.verification_status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                    {domain.verification_status}
                  </Badge>
                  <Badge className={
                    domain.ssl_status === 'issued' ? 'bg-green-100 text-green-800' :
                    domain.ssl_status === 'failed' ? 'bg-red-100 text-red-800' :
                    domain.ssl_status === 'expired' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    SSL: {domain.ssl_status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {domain.verification_status !== 'verified' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleVerifyDomain(domain.id, domain.domain)}
                      data-testid={`button-verify-${domain.id}`}
                    >
                      Verify
                    </Button>
                  )}
                  {domain.verification_status === 'verified' && domain.ssl_status !== 'issued' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleGenerateSSL(domain.domain)}
                      data-testid={`button-ssl-${domain.id}`}
                    >
                      Generate SSL
                    </Button>
                  )}
                  {!domain.is_primary && domain.verification_status === 'verified' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleSetPrimary(domain.id)}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDeleteDomain(domain.id, domain.domain)}
                    data-testid={`button-delete-${domain.id}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {domain.verification_status === 'pending' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <p className="font-medium text-yellow-900">DNS Verification Required</p>
                  <p className="text-yellow-700 mt-1">
                    Add this TXT record to your DNS:
                  </p>
                  <code className="block mt-2 p-2 bg-white rounded">
                    <strong>Name:</strong> _verification.{domain.domain}<br />
                    <strong>Type:</strong> TXT<br />
                    <strong>Value:</strong> {domain.verification_token}
                  </code>
                </div>
              )}

              {domain.verification_status === 'verified' && domain.ssl_status === 'pending' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="text-blue-900">
                    Domain verified! Click "Generate SSL" to create an SSL certificate for HTTPS.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddDomainModal
          organizationId={organizationId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadDomains();
          }}
        />
      )}
    </div>
  );
}

// Add Domain Modal
interface AddDomainModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddDomainModal({ organizationId, onClose, onSuccess }: AddDomainModalProps) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate domain format
      const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
      const canonicalDomain = domain.toLowerCase().trim();

      if (!domainRegex.test(canonicalDomain)) {
        toast.error('Invalid domain format');
        setLoading(false);
        return;
      }

      // Insert domain into database
      const { error } = await supabase
        .from('organization_domains')
        .insert({
          organization_id: organizationId,
          domain: canonicalDomain,
          verification_status: 'pending',
          ssl_status: 'pending'
        });

      if (error) throw error;

      toast.success('Domain added successfully! Please verify it by adding the DNS TXT record.');
      onSuccess();
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error('Failed to add domain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Custom Domain</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Domain Name</label>
            <Input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              required
              data-testid="input-domain"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your domain name without http:// or www
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-medium text-blue-900 mb-2">Setup Instructions</h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Add your domain above and click "Add Domain"</li>
              <li>You'll receive a verification token</li>
              <li>Add a TXT record to your DNS with the verification token</li>
              <li>Click "Verify" to confirm DNS setup</li>
              <li>Once verified, click "Generate SSL" to enable HTTPS</li>
            </ol>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} data-testid="button-submit-domain">
              {loading ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Settings Admin View Component
interface SettingsAdminViewProps {
  organization: any;
}

function SettingsAdminView({ organization }: SettingsAdminViewProps) {
  const [formData, setFormData] = useState({
    name: organization.name || '',
    contact_email: organization.contact_email || '',
    contact_phone: organization.contact_phone || '',
    primary_color: organization.primary_color || '#3B82F6',
    secondary_color: organization.secondary_color || '#1E40AF',
    membership_year_start_month: organization.membership_year_start_month || 1,
    membership_year_end_month: organization.membership_year_end_month || 12,
    renewal_enabled: organization.renewal_enabled !== undefined ? organization.renewal_enabled : true,
    renewal_form_schema_id: organization.renewal_form_schema_id || null
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [availableForms, setAvailableForms] = useState<Array<{id: string, title: string, form_type: string}>>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(organization.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load available forms for renewal
  useEffect(() => {
    const loadForms = async () => {
      try {
        setLoadingForms(true);
        const { data, error } = await supabase
          .from('organization_form_schemas')
          .select('id, title, form_type')
          .eq('organization_id', organization.id)
          .in('form_type', ['renewal', 'both'])
          .eq('is_active', true)
          .order('title');

        if (error) throw error;
        setAvailableForms(data || []);
      } catch (error) {
        console.error('Error loading forms:', error);
        toast.error('Failed to load renewal forms. Please refresh the page.');
      } finally {
        setLoadingForms(false);
      }
    };

    loadForms();
  }, [organization.id]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      // Delete old logo if it exists
      if (logoUrl) {
        const oldFileName = logoUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('organization-logos')
            .remove([oldFileName]);
        }
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage (using public bucket)
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(fileName);

      // Update organization logo_url in database
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: publicUrl })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      // Update local state
      setLogoUrl(publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      if (error.message?.includes('Bucket not found')) {
        toast.error('Storage not configured. Logo upload is not available yet.');
      } else {
        toast.error('Failed to upload logo');
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          membership_year_start_month: formData.membership_year_start_month,
          membership_year_end_month: formData.membership_year_end_month,
          renewal_enabled: formData.renewal_enabled,
          renewal_form_schema_id: formData.renewal_form_schema_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Settings saved successfully! Reload the page to see changes.' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>Update organization branding and contact information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Organization Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            data-testid="input-org-name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Contact Email</label>
            <Input
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              data-testid="input-contact-email"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contact Phone</label>
            <Input
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              data-testid="input-contact-phone"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Primary Color</label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-20"
                data-testid="input-primary-color"
              />
              <span className="text-sm text-gray-600">{formData.primary_color}</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Secondary Color</label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-20"
                data-testid="input-secondary-color"
              />
              <span className="text-sm text-gray-600">{formData.secondary_color}</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Organization Logo</h3>
          <div className="space-y-4">
            {logoUrl && (
              <div className="flex items-center gap-4">
                <img 
                  src={logoUrl} 
                  alt="Organization logo" 
                  className="h-20 w-20 object-contain rounded border"
                />
                <div className="text-sm text-gray-600">
                  Current logo
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Upload New Logo</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="mt-1"
                data-testid="input-logo-upload"
              />
              <p className="text-xs text-gray-500 mt-1">
                {uploadingLogo ? 'Uploading...' : 'PNG, JPG or GIF (max 2MB)'}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Membership Year Configuration</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Membership Year Starts</label>
                <select
                  value={formData.membership_year_start_month}
                  onChange={(e) => setFormData({ ...formData, membership_year_start_month: parseInt(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="select-year-start-month"
                >
                  {monthNames.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">When does your membership year begin?</p>
              </div>
              <div>
                <label className="text-sm font-medium">Membership Year Ends</label>
                <select
                  value={formData.membership_year_end_month}
                  onChange={(e) => setFormData({ ...formData, membership_year_end_month: parseInt(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="select-year-end-month"
                >
                  {monthNames.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">When does your membership year end?</p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-900">
                Example: If your membership year runs from <strong>{monthNames[formData.membership_year_start_month - 1]}</strong> to <strong>{monthNames[formData.membership_year_end_month - 1]}</strong>,
                new members signing up will automatically be added to the current membership year.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Renewal Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="renewal-enabled"
                checked={formData.renewal_enabled}
                onChange={(e) => setFormData({ ...formData, renewal_enabled: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                data-testid="checkbox-renewal-enabled"
              />
              <label htmlFor="renewal-enabled" className="text-sm font-medium">
                Enable Membership Renewal
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-8">
              When enabled, members will see a "Renew Membership" button on their dashboard.
            </p>

            {formData.renewal_enabled && (
              <div className="ml-8 space-y-2">
                <label htmlFor="renewal-form" className="text-sm font-medium">
                  Renewal Form
                </label>
                <select
                  id="renewal-form"
                  value={formData.renewal_form_schema_id || ''}
                  onChange={(e) => setFormData({ ...formData, renewal_form_schema_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingForms}
                  data-testid="select-renewal-form"
                >
                  <option value="">Use default signup form</option>
                  {loadingForms ? (
                    <option disabled>Loading forms...</option>
                  ) : availableForms.length === 0 ? (
                    <option disabled>No renewal forms available - create one in "Signup Forms"</option>
                  ) : (
                    availableForms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.title} ({form.form_type === 'both' ? 'Signup & Renewal' : 'Renewal Only'})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-gray-500">
                  Select a specific form for renewals, or leave blank to use your signup form. 
                  Create renewal forms in the "Signup Forms" tab with form type "Renewal" or "Both".
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-settings">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Custom Domains Section */}
        <div className="pt-6 border-t mt-6">
          <CustomDomainsManager organizationId={organization.id} />
        </div>
      </CardContent>
    </Card>
  );
}

// Add Member Modal
interface AddMemberModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddMemberModal({ organizationId, onClose, onSuccess }: AddMemberModalProps) {
  const [formData, setFormData] = useState({
    user_id: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate user_id is provided
      if (!formData.user_id) {
        setError('User ID is required. The user must first create a Supabase Auth account.');
        setLoading(false);
        return;
      }

      // Create profile for existing Supabase Auth user
      const { data, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: formData.user_id,
          organization_id: organizationId,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          role: formData.role,
          is_active: true
        })
        .select()
        .single();

      if (profileError) throw profileError;

      console.log('Member profile created:', data);
      toast.success('Member added successfully', {
        description: `${formData.first_name} ${formData.last_name} has been added to the organization`
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding member:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add member';
      setError(errorMessage);
      toast.error('Failed to add member', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="modal-add-member">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl">Add New Member</CardTitle>
          <CardDescription>Create a new member or admin account for this organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="text-lg">ℹ️</span> How to Add Members
            </p>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>Ask the user to create an account by visiting your organization's login page and clicking "Sign Up"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>After they sign up, go to your <strong>Supabase Dashboard → Authentication → Users</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Find their user record and copy their <strong>User ID</strong> (UUID format)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                <span>Enter the User ID and their details below, then select their role (Member or Admin)</span>
              </li>
            </ol>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                User ID (from Supabase Auth) *
              </label>
              <Input
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                required
                className="font-mono text-sm"
                data-testid="input-user-id"
              />
              <p className="text-xs text-gray-500">
                Get this from Supabase Dashboard → Authentication → Users
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">First Name *</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Last Name *</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  data-testid="input-last-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email Address *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Phone Number</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Optional"
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="select-role"
              >
                <option value="member">Member - Can view their profile and memberships</option>
                <option value="admin">Admin - Can manage members and organization settings</option>
              </select>
              <p className="text-xs text-gray-500">
                Admins have full access to manage the organization
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-900 mb-1">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={loading} 
                data-testid="button-cancel-add"
                size="lg"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading} 
                data-testid="button-submit-add"
                size="lg"
              >
                {loading ? 'Adding Member...' : 'Add Member'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Edit Member Modal
interface EditMemberModalProps {
  member: any;
  onClose: () => void;
  onSuccess: () => void;
}

function EditMemberModal({ member, onClose, onSuccess }: EditMemberModalProps) {
  const [formData, setFormData] = useState({
    first_name: member.first_name || '',
    last_name: member.last_name || '',
    email: member.email || '',
    phone: member.phone || '',
    role: member.role || 'member'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="modal-edit-member">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Edit Member</CardTitle>
          <CardDescription>Update member information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  data-testid="input-edit-first-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  data-testid="input-edit-last-name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="input-edit-email"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-edit-phone"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2 border rounded"
                data-testid="select-edit-role"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading} data-testid="button-cancel-edit-member">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} data-testid="button-submit-edit-member">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
// Profile View Component
interface ProfileViewProps {
  user: any;
  organization: any;
  onBack: () => void;
}

function ProfileView({ user, organization, onBack }: ProfileViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [user?.id, organization?.id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone
        })
        .eq('id', profile.id)
        .eq('organization_id', organization.id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack} data-testid="button-back-to-dashboard">
          ← Back to Dashboard
        </Button>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Profile</h2>
        <Button variant="outline" onClick={onBack} data-testid="button-back-to-dashboard">
          ← Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  data-testid="input-first-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  data-testid="input-last-name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="input-email"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-phone"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-medium text-sm">Account Information</h3>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Organization:</span> {organization.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Role:</span> {profile?.role || 'member'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Status:</span>{' '}
                <Badge variant={profile?.is_active ? 'default' : 'secondary'}>
                  {profile?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </p>
            </div>

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700" data-testid="alert-success">
                {success}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700" data-testid="alert-error">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={saving}
                data-testid="button-save-profile"
                style={{ backgroundColor: organization?.primary_color || '#3B82F6' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Events View Component
interface EventsViewProps {
  organizationId: string;
  profileId: string;
  onBack: () => void;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  registration_url: string | null;
  max_attendees: number | null;
  current_attendees: number;
  registration_deadline: string | null;
  allow_waitlist: boolean;
  require_approval: boolean;
}

interface EventRegistration {
  id: string;
  event_id: string;
  status: 'registered' | 'waitlist' | 'cancelled' | 'checked_in' | 'pending_approval';
  registered_at: string;
}

function EventsView({ organizationId, profileId, onBack }: EventsViewProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
  const [cancellingEventId, setCancellingEventId] = useState<string | null>(null);

  useEffect(() => {
    fetchEventsAndRegistrations();
  }, [organizationId, profileId]);

  const fetchEventsAndRegistrations = async () => {
    try {
      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_published', true)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        toast.error('Failed to load events', {
          description: eventsError.message
        });
        setEvents([]);
      } else {
        setEvents(eventsData || []);
      }

      // Fetch user's registrations
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('id, event_id, status, registered_at')
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId)
        .neq('status', 'cancelled');

      if (registrationsError) {
        console.error('Error fetching registrations:', registrationsError);
      } else {
        setRegistrations(registrationsData || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching events:', err);
      toast.error('Failed to load events');
      setEvents([]);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const getRegistrationStatus = (eventId: string) => {
    return registrations.find(reg => reg.event_id === eventId);
  };

  const isRegistrationDeadlinePassed = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const handleRegister = async (event: Event) => {
    if (!profileId) {
      toast.error('You must be logged in to register');
      return;
    }

    // Check registration deadline
    if (isRegistrationDeadlinePassed(event.registration_deadline)) {
      toast.error('Registration deadline has passed');
      return;
    }

    setRegisteringEventId(event.id);

    try {
      // Determine status based on capacity and settings
      let status: 'registered' | 'waitlist' | 'pending_approval' = 'registered';
      
      if (event.require_approval) {
        status = 'pending_approval';
      } else if (event.max_attendees && event.current_attendees >= event.max_attendees) {
        if (event.allow_waitlist) {
          status = 'waitlist';
        } else {
          toast.error('Event is full and waitlist is not available');
          setRegisteringEventId(null);
          return;
        }
      }

      // Create registration
      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          profile_id: profileId,
          organization_id: organizationId,
          status: status
        });

      if (error) {
        console.error('Error registering for event:', error);
        toast.error('Failed to register for event', {
          description: error.message
        });
      } else {
        if (status === 'pending_approval') {
          toast.success('Registration submitted for approval');
        } else if (status === 'waitlist') {
          toast.success('Added to waitlist');
        } else {
          toast.success('Successfully registered for event');
        }
        
        // Refresh data
        await fetchEventsAndRegistrations();
      }
    } catch (err) {
      console.error('Unexpected error registering:', err);
      toast.error('Failed to register for event');
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleCancelRegistration = async (eventId: string, registrationId: string) => {
    setCancellingEventId(eventId);

    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', registrationId);

      if (error) {
        console.error('Error cancelling registration:', error);
        toast.error('Failed to cancel registration', {
          description: error.message
        });
      } else {
        toast.success('Registration cancelled');
        // Refresh data
        await fetchEventsAndRegistrations();
      }
    } catch (err) {
      console.error('Unexpected error cancelling registration:', err);
      toast.error('Failed to cancel registration');
    } finally {
      setCancellingEventId(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'registered':
        return 'default';
      case 'waitlist':
        return 'secondary';
      case 'pending_approval':
        return 'outline';
      case 'checked_in':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'registered':
        return 'Registered';
      case 'waitlist':
        return 'Waitlist';
      case 'pending_approval':
        return 'Pending Approval';
      case 'checked_in':
        return 'Checked In';
      default:
        return status;
    }
  };

  const formatEventDate = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const formattedStart = start.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (!endDate) return formattedStart;

    const end = new Date(endDate);
    const formattedEnd = end.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${formattedStart} - ${formattedEnd}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Events</h2>
        <Button variant="outline" onClick={onBack} data-testid="button-back-to-dashboard">
          ← Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
          <CardDescription>View and register for organization events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8" data-testid="loading-events">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12" data-testid="no-events">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Upcoming Events</h3>
              <p className="text-gray-600">
                There are currently no upcoming events scheduled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const registration = getRegistrationStatus(event.id);
                const isDeadlinePassed = isRegistrationDeadlinePassed(event.registration_deadline);
                const isFull = event.max_attendees ? event.current_attendees >= event.max_attendees : false;
                const isRegistering = registeringEventId === event.id;
                const isCancelling = cancellingEventId === event.id;

                return (
                  <div 
                    key={event.id} 
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow" 
                    data-testid={`event-card-${event.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold" data-testid={`event-title-${event.id}`}>
                            {event.title}
                          </h3>
                          {registration && (
                            <Badge 
                              variant={getStatusBadgeVariant(registration.status)}
                              data-testid={`badge-status-${event.id}`}
                            >
                              {getStatusLabel(registration.status)}
                            </Badge>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-gray-600 mb-2" data-testid={`event-description-${event.id}`}>
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1" data-testid={`event-date-${event.id}`}>
                        <Calendar className="h-4 w-4" />
                        {formatEventDate(event.start_date, event.end_date)}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1" data-testid={`event-location-${event.id}`}>
                          <span>📍</span>
                          {event.location}
                        </div>
                      )}
                      {event.max_attendees && (
                        <div 
                          className="flex items-center gap-1 font-medium" 
                          data-testid={`event-capacity-${event.id}`}
                        >
                          <span>👥</span>
                          {event.current_attendees}/{event.max_attendees} spots filled
                          {isFull && !event.allow_waitlist && (
                            <Badge variant="secondary" className="ml-1">Full</Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {event.registration_deadline && (
                      <div className="text-sm mb-3" data-testid={`event-deadline-${event.id}`}>
                        <span className="font-medium">Registration Deadline:</span>{' '}
                        <span className={isDeadlinePassed ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {formatDate(event.registration_deadline)}
                          {isDeadlinePassed && ' (Passed)'}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {registration ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRegistration(event.id, registration.id)}
                          disabled={isCancelling}
                          data-testid={`button-cancel-registration-${event.id}`}
                        >
                          {isCancelling ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Cancel Registration
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleRegister(event)}
                          disabled={isRegistering || isDeadlinePassed || (isFull && !event.allow_waitlist)}
                          data-testid={`button-register-${event.id}`}
                        >
                          {isRegistering ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Registering...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {isFull && event.allow_waitlist ? 'Join Waitlist' : 'RSVP'}
                            </>
                          )}
                        </Button>
                      )}
                      {event.registration_url && !registration && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(event.registration_url!, '_blank')}
                          data-testid={`button-external-register-${event.id}`}
                        >
                          External Registration
                        </Button>
                      )}
                    </div>

                    {event.require_approval && !registration && (
                      <p className="text-xs text-gray-500 mt-2" data-testid={`event-approval-note-${event.id}`}>
                        * Registration requires approval from event organizers
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Messages View Component
interface MessagesViewProps {
  organizationId: string;
  onBack: () => void;
}

function MessagesView({ organizationId, onBack }: MessagesViewProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [organizationId]);

  const fetchMessages = async () => {
    try {
      const { data, error} = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack} data-testid="button-back-to-dashboard">
          ← Back to Dashboard
        </Button>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Messages & Announcements</h2>
        <Button variant="outline" onClick={onBack} data-testid="button-back-to-dashboard">
          ← Back to Dashboard
        </Button>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Messages Yet</h3>
            <p className="text-gray-600">
              Organization announcements and updates will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id} data-testid={`message-${message.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{message.subject}</CardTitle>
                    <CardDescription>
                      {formatDate(message.sent_at)}
                      {message.recipient_count > 0 && ` • Sent to ${message.recipient_count} members`}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {message.opened_count || 0} opened
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content) }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Subscriptions View Component - For members to manage their mailing list subscriptions
interface SubscriptionsViewProps {
  organizationId: string;
  userEmail: string;
}

interface MailingListWithSubscription {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  subscriber_count: number;
  subscriber_id: string | null;
  subscription_status: 'subscribed' | 'unsubscribed' | 'pending' | null;
}

function SubscriptionsView({ organizationId, userEmail }: SubscriptionsViewProps) {
  const [lists, setLists] = useState<MailingListWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriberId, setSubscriberId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriberId();
  }, [userEmail, organizationId]);

  useEffect(() => {
    if (subscriberId) {
      fetchListsWithSubscriptions();
    }
  }, [subscriberId, organizationId]);

  const fetchSubscriberId = async () => {
    try {
      // Get or create subscriber record for this user
      const { data: existingSubscriber } = await supabase
        .from('subscribers')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('email', userEmail)
        .single();

      if (existingSubscriber) {
        setSubscriberId(existingSubscriber.id);
      } else {
        // Create subscriber if doesn't exist
        const { data: newSubscriber, error } = await supabase
          .from('subscribers')
          .insert({
            organization_id: organizationId,
            email: userEmail,
            status: 'subscribed'
          })
          .select('id')
          .single();

        if (error) throw error;
        setSubscriberId(newSubscriber.id);
      }
    } catch (error) {
      console.error('Error fetching subscriber:', error);
      toast.error('Failed to load subscriber information');
    }
  };

  const fetchListsWithSubscriptions = async () => {
    try {
      // Fetch all active mailing lists
      const { data: mailingLists, error: listsError } = await supabase
        .from('mailing_lists')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      // Fetch user's subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriber_lists')
        .select('mailing_list_id, status')
        .eq('subscriber_id', subscriberId);

      if (subsError) throw subsError;

      // Merge the data
      const listsWithSubs = (mailingLists || []).map(list => {
        const subscription = subscriptions?.find(s => s.mailing_list_id === list.id);
        return {
          ...list,
          subscriber_id: subscriberId,
          subscription_status: subscription?.status || null
        };
      });

      setLists(listsWithSubs);
    } catch (error) {
      console.error('Error fetching lists:', error);
      toast.error('Failed to load mailing lists');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubscription = async (listId: string, currentStatus: string | null) => {
    if (!subscriberId) return;

    try {
      if (currentStatus === 'subscribed') {
        // Unsubscribe
        const { error } = await supabase
          .from('subscriber_lists')
          .update({ 
            status: 'unsubscribed',
            unsubscribed_at: new Date().toISOString()
          })
          .eq('subscriber_id', subscriberId)
          .eq('mailing_list_id', listId);

        if (error) throw error;
        toast.success('Unsubscribed from list');
      } else if (currentStatus === 'unsubscribed' || currentStatus === null) {
        // Resubscribe or subscribe for first time
        if (currentStatus === 'unsubscribed') {
          const { error } = await supabase
            .from('subscriber_lists')
            .update({ 
              status: 'subscribed',
              subscribed_at: new Date().toISOString(),
              unsubscribed_at: null
            })
            .eq('subscriber_id', subscriberId)
            .eq('mailing_list_id', listId);

          if (error) throw error;
        } else {
          // First time subscription
          const { error } = await supabase
            .from('subscriber_lists')
            .insert({
              subscriber_id: subscriberId,
              mailing_list_id: listId,
              status: 'subscribed'
            });

          if (error) throw error;
        }
        toast.success('Subscribed to list');
      }

      fetchListsWithSubscriptions();
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading mailing lists...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mailing List Subscriptions</h2>
        <p className="text-gray-600 mt-1">
          Manage your email subscriptions and choose which lists you'd like to receive updates from
        </p>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Mailing Lists Available</h3>
            <p className="text-gray-600">
              There are currently no mailing lists available for subscription.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <Card key={list.id} data-testid={`subscription-card-${list.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {list.name}
                      {list.subscription_status === 'subscribed' && (
                        <Badge variant="default">Subscribed</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{list.description || 'No description available'}</CardDescription>
                  </div>
                  <Button
                    variant={list.subscription_status === 'subscribed' ? 'outline' : 'default'}
                    onClick={() => toggleSubscription(list.id, list.subscription_status)}
                    data-testid={`button-toggle-subscription-${list.id}`}
                  >
                    {list.subscription_status === 'subscribed' ? 'Unsubscribe' : 'Subscribe'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>{list.subscriber_count} subscribers</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> You can subscribe or unsubscribe from any list at any time. Your preferences will be saved automatically.
        </p>
      </div>
    </div>
  );
}

// Mailing Admin View Component
interface MailingAdminViewProps {
  organizationId: string;
}

function MailingAdminView({ organizationId }: MailingAdminViewProps) {
  const [tab, setTab] = useState<'lists' | 'subscribers' | 'campaigns'>('lists');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mailing List Management</h2>
        <p className="text-gray-600 mt-1">Manage mailing lists, subscribers and email campaigns</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setTab('lists')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              tab === 'lists'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            data-testid="tab-lists"
          >
            Mailing Lists
          </button>
          <button
            onClick={() => setTab('subscribers')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              tab === 'subscribers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            data-testid="tab-subscribers"
          >
            Subscribers
          </button>
          <button
            onClick={() => setTab('campaigns')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              tab === 'campaigns'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            data-testid="tab-campaigns"
          >
            Email Campaigns
          </button>
        </nav>
      </div>

      {tab === 'lists' && <MailingListsView organizationId={organizationId} />}
      {tab === 'subscribers' && <SubscribersView organizationId={organizationId} />}
      {tab === 'campaigns' && <CampaignsView organizationId={organizationId} />}
    </div>
  );
}

// Mailing Lists View Component
interface MailingListsViewProps {
  organizationId: string;
}

interface MailingList {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  subscriber_count: number;
  created_at: string;
}

function MailingListsView({ organizationId }: MailingListsViewProps) {
  const [lists, setLists] = useState<MailingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<MailingList | null>(null);

  useEffect(() => {
    fetchLists();
  }, [organizationId]);

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from('mailing_lists')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error('Error fetching mailing lists:', error);
      toast.error('Failed to load mailing lists');
    } finally {
      setLoading(false);
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this mailing list? All subscriber associations will be removed.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('mailing_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
      toast.success('Mailing list deleted');
      fetchLists();
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Failed to delete mailing list');
    }
  };

  const toggleActive = async (listId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('mailing_lists')
        .update({ is_active: !currentStatus })
        .eq('id', listId);

      if (error) throw error;
      toast.success(`Mailing list ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchLists();
    } catch (error) {
      console.error('Error updating list:', error);
      toast.error('Failed to update mailing list');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading mailing lists...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{lists.length} mailing lists</p>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-list">
          + Create List
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Mailing Lists Yet</h3>
            <p className="text-gray-600 mb-4">
              Create mailing lists to organize your subscribers into different groups.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>Create First List</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <Card key={list.id} data-testid={`list-card-${list.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {list.name}
                      {!list.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </CardTitle>
                    <CardDescription>{list.description || 'No description'}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(list.id, list.is_active)}
                      data-testid={`button-toggle-${list.id}`}
                    >
                      {list.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingList(list)}
                      data-testid={`button-edit-${list.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteList(list.id)}
                      data-testid={`button-delete-${list.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Slug:</span> {list.slug}
                  </div>
                  <div>
                    <span className="font-medium">Subscribers:</span> {list.subscriber_count}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(list.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingList) && (
        <CreateEditListModal
          organizationId={organizationId}
          list={editingList}
          onClose={() => {
            setShowCreateModal(false);
            setEditingList(null);
          }}
          onSuccess={() => {
            fetchLists();
            setShowCreateModal(false);
            setEditingList(null);
          }}
        />
      )}
    </div>
  );
}

// Create/Edit List Modal Component
interface CreateEditListModalProps {
  organizationId: string;
  list: MailingList | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEditListModal({ organizationId, list, onClose, onSuccess }: CreateEditListModalProps) {
  const [formData, setFormData] = useState({
    name: list?.name || '',
    description: list?.description || '',
    slug: list?.slug || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const slug = formData.slug || generateSlug(formData.name);
      
      if (list) {
        // Update existing list
        const { error } = await supabase
          .from('mailing_lists')
          .update({
            name: formData.name,
            description: formData.description,
            slug: slug,
          })
          .eq('id', list.id);

        if (error) throw error;
        toast.success('Mailing list updated');
      } else {
        // Create new list
        const { error } = await supabase
          .from('mailing_lists')
          .insert({
            organization_id: organizationId,
            name: formData.name,
            description: formData.description,
            slug: slug,
          });

        if (error) throw error;
        toast.success('Mailing list created');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving list:', error);
      if (error.code === '23505') {
        toast.error('A list with this slug already exists');
      } else {
        toast.error('Failed to save mailing list');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{list ? 'Edit Mailing List' : 'Create Mailing List'}</CardTitle>
          <CardDescription>
            {list ? 'Update the mailing list details' : 'Create a new mailing list for your organization'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (!list && !formData.slug) {
                    setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) });
                  }
                }}
                placeholder="e.g., Monthly Newsletter"
                required
                data-testid="input-list-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Slug *</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                placeholder="e.g., monthly-newsletter"
                required
                pattern="[a-z0-9-]+"
                data-testid="input-list-slug"
              />
              <p className="text-xs text-gray-500 mt-1">Used in URLs (lowercase, numbers, hyphens only)</p>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                data-testid="input-list-description"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} data-testid="button-save-list">
                {submitting ? 'Saving...' : list ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Subscribers View Component
interface SubscribersViewProps {
  organizationId: string;
}

interface Subscriber {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  subscribed_at: string;
  subscription_source: string | null;
}

function SubscribersView({ organizationId }: SubscribersViewProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchSubscribers();
  }, [organizationId]);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
      toast.success('Subscribers loaded');
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast.error('Failed to load subscribers');
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (subscriberId: string) => {
    try {
      const { error } = await supabase
        .from('subscribers')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString()
        })
        .eq('id', subscriberId);

      if (error) throw error;
      toast.success('Subscriber unsubscribed');
      fetchSubscribers();
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to unsubscribe');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading subscribers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">{subscribers.filter(s => s.status === 'subscribed').length} active subscribers</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} data-testid="button-add-subscriber">
          + Add Subscriber
        </Button>
      </div>

      {subscribers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Subscribers Yet</h3>
            <p className="text-gray-600 mb-4">
              Start building your mailing list by adding subscribers.
            </p>
            <Button onClick={() => setShowAddModal(true)}>Add First Subscriber</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscribed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.id} data-testid={`subscriber-row-${subscriber.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subscriber.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subscriber.first_name && subscriber.last_name
                          ? `${subscriber.first_name} ${subscriber.last_name}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={subscriber.status === 'subscribed' ? 'default' : 'secondary'}>
                          {subscriber.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(subscriber.subscribed_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {subscriber.status === 'subscribed' && (
                          <button
                            onClick={() => handleUnsubscribe(subscriber.id)}
                            className="text-red-600 hover:text-red-900"
                            data-testid={`button-unsubscribe-${subscriber.id}`}
                          >
                            Unsubscribe
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showAddModal && (
        <AddSubscriberModal
          organizationId={organizationId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchSubscribers();
          }}
        />
      )}
    </div>
  );
}

// Add Subscriber Modal
interface AddSubscriberModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddSubscriberModal({ organizationId, onClose, onSuccess }: AddSubscriberModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('subscribers')
        .insert({
          organization_id: organizationId,
          email: formData.email,
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          status: 'subscribed',
          subscribed_at: new Date().toISOString(),
          subscription_source: 'admin'
        });

      if (error) throw error;

      toast.success('Subscriber added successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error adding subscriber:', error);
      toast.error(error.message || 'Failed to add subscriber');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="modal-add-subscriber">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Add Subscriber</CardTitle>
          <CardDescription>Add a new email subscriber to your mailing list</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="subscriber@example.com"
                required
                data-testid="input-subscriber-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="John"
                  data-testid="input-subscriber-first-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Doe"
                  data-testid="input-subscriber-last-name"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1" data-testid="button-submit-subscriber">
                {loading ? 'Adding...' : 'Add Subscriber'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Campaigns View Component
interface CampaignsViewProps {
  organizationId: string;
}

interface Campaign {
  id: string;
  title: string;
  subject: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number | null;
  created_at: string;
}

function CampaignsView({ organizationId }: CampaignsViewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [organizationId]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
      toast.success('Campaigns loaded');
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{campaigns.length} campaigns</p>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-campaign">
          + Create Campaign
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Email Configuration:</strong> Email campaigns are sent using Resend. Make sure your RESEND_API_KEY is configured in your environment to enable sending campaigns to subscribers.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Campaigns Yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first email campaign to communicate with your subscribers.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>Create First Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} data-testid={`campaign-card-${campaign.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{campaign.title}</CardTitle>
                    <CardDescription>Subject: {campaign.subject}</CardDescription>
                  </div>
                  <Badge variant={
                    campaign.status === 'sent' ? 'default' :
                    campaign.status === 'draft' ? 'secondary' : 'secondary'
                  }>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(campaign.created_at)}
                  </div>
                  {campaign.sent_at && (
                    <div>
                      <span className="font-medium">Sent:</span> {formatDate(campaign.sent_at)}
                    </div>
                  )}
                  {campaign.recipient_count && (
                    <div>
                      <span className="font-medium">Recipients:</span> {campaign.recipient_count}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCampaignModal
          organizationId={organizationId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCampaigns();
          }}
        />
      )}
    </div>
  );
}

// Create Campaign Modal
interface CreateCampaignModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateCampaignModal({ organizationId, onClose, onSuccess }: CreateCampaignModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user?.profile?.id) {
        throw new Error('User profile not found');
      }

      const { error } = await supabase
        .from('email_campaigns')
        .insert({
          organization_id: organizationId,
          title: formData.title,
          subject: formData.subject,
          content: formData.content,
          status: 'draft',
          created_by: user.profile.id
        });

      if (error) throw error;

      toast.success('Campaign created successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto" data-testid="modal-create-campaign">
      <Card className="w-full max-w-2xl mx-4 my-8">
        <CardHeader>
          <CardTitle>Create Email Campaign</CardTitle>
          <CardDescription>Create a new email campaign for your subscribers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Campaign Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Monthly Newsletter - January 2025"
                required
                data-testid="input-campaign-title"
              />
              <p className="text-xs text-gray-500 mt-1">Internal name for this campaign</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email Subject *</label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Your Monthly Update from Our Organization"
                required
                data-testid="input-campaign-subject"
              />
              <p className="text-xs text-gray-500 mt-1">This will appear in recipients' inboxes</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email Content *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your email content here. HTML is supported."
                required
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-campaign-content"
              />
              <p className="text-xs text-gray-500 mt-1">HTML formatting is supported</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Note:</strong> This campaign will be saved as a draft. To send it, you'll need to set up the Resend integration for email delivery.
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1" data-testid="button-submit-campaign">
                {loading ? 'Creating...' : 'Create Draft'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Event Registrations View Component
interface AdminEventRegistrationsViewProps {
  organizationId: string;
}

interface EventWithRegistrations {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  max_attendees: number | null;
  registration_count: number;
  registered_count: number;
  waitlist_count: number;
  checked_in_count: number;
  cancelled_count: number;
}

interface RegistrationWithProfile {
  id: string;
  event_id: string;
  profile_id: string;
  status: 'registered' | 'waitlist' | 'cancelled' | 'checked_in' | 'pending_approval';
  registered_at: string;
  checked_in_at: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

function AdminEventRegistrationsView({ organizationId }: AdminEventRegistrationsViewProps) {
  const [events, setEvents] = useState<EventWithRegistrations[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithRegistrations | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRegistrations, setSelectedRegistrations] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEvents();
  }, [organizationId]);

  useEffect(() => {
    if (selectedEvent) {
      fetchRegistrations(selectedEvent.id);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: false });

      if (eventsError) throw eventsError;

      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { data: registrationsData } = await supabase
            .from('event_registrations')
            .select('status')
            .eq('event_id', event.id);

          const registrations = registrationsData || [];
          return {
            ...event,
            registration_count: registrations.length,
            registered_count: registrations.filter(r => r.status === 'registered').length,
            waitlist_count: registrations.filter(r => r.status === 'waitlist').length,
            checked_in_count: registrations.filter(r => r.status === 'checked_in').length,
            cancelled_count: registrations.filter(r => r.status === 'cancelled').length,
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async (eventId: string) => {
    setRegistrationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          profile_id,
          status,
          registered_at,
          checked_in_at,
          profiles:profile_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });

      if (error) throw error;
      setRegistrations((data as any) || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations');
      setRegistrations([]);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const handleCheckIn = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({
          status: 'checked_in',
          checked_in_at: new Date().toISOString()
        })
        .eq('id', registrationId);

      if (error) throw error;
      toast.success('Member checked in successfully');
      if (selectedEvent) {
        await fetchRegistrations(selectedEvent.id);
        await fetchEvents();
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in member');
    }
  };

  const handleBulkCheckIn = async () => {
    if (selectedRegistrations.size === 0) {
      toast.error('Please select registrations to check in');
      return;
    }

    try {
      const updates = Array.from(selectedRegistrations).map(id =>
        supabase
          .from('event_registrations')
          .update({
            status: 'checked_in',
            checked_in_at: new Date().toISOString()
          })
          .eq('id', id)
      );

      await Promise.all(updates);
      toast.success(`Checked in ${selectedRegistrations.size} members`);
      setSelectedRegistrations(new Set());
      if (selectedEvent) {
        await fetchRegistrations(selectedEvent.id);
        await fetchEvents();
      }
    } catch (error) {
      console.error('Error bulk checking in:', error);
      toast.error('Failed to bulk check in');
    }
  };

  const exportToCSV = () => {
    if (filteredRegistrations.length === 0) {
      toast.error('No registrations to export');
      return;
    }

    const headers = ['Name', 'Email', 'Status', 'Registered Date', 'Checked In Date'];
    const rows = filteredRegistrations.map(reg => [
      `${reg.profiles.first_name} ${reg.profiles.last_name}`,
      reg.profiles.email,
      reg.status,
      formatDate(reg.registered_at),
      reg.checked_in_at ? formatDate(reg.checked_in_at) : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEvent?.title || 'event'}-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = searchTerm === '' || 
      reg.profiles.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.profiles.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.profiles.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedRegistrations.size === filteredRegistrations.length) {
      setSelectedRegistrations(new Set());
    } else {
      setSelectedRegistrations(new Set(filteredRegistrations.map(r => r.id)));
    }
  };

  const toggleSelectRegistration = (id: string) => {
    const newSelected = new Set(selectedRegistrations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRegistrations(newSelected);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'registered':
        return 'default';
      case 'checked_in':
        return 'default';
      case 'waitlist':
        return 'secondary';
      case 'cancelled':
        return 'secondary';
      case 'pending_approval':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Event Registrations</h2>
        <div className="text-center py-12" data-testid="loading-events">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event Registrations</h2>
        <p className="text-gray-600 mt-1">Manage event registrations and check-ins</p>
      </div>

      {!selectedEvent ? (
        <div>
          {events.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center" data-testid="no-events">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Events Found</h3>
                <p className="text-gray-600">There are no events in the system yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <Card 
                  key={event.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                  data-testid={`event-card-${event.id}`}
                >
                  <CardHeader>
                    <CardTitle className="text-lg" data-testid={`event-title-${event.id}`}>
                      {event.title}
                    </CardTitle>
                    <CardDescription data-testid={`event-date-${event.id}`}>
                      {formatDate(event.start_date)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span data-testid={`event-registered-${event.id}`}>{event.registered_count} Registered</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span data-testid={`event-checked-in-${event.id}`}>{event.checked_in_count} Checked In</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span data-testid={`event-waitlist-${event.id}`}>{event.waitlist_count} Waitlist</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4 text-red-600" />
                          <span data-testid={`event-cancelled-${event.id}`}>{event.cancelled_count} Cancelled</span>
                        </div>
                      </div>
                      {event.location && (
                        <p className="text-sm text-gray-600">📍 {event.location}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold" data-testid="selected-event-title">
                {selectedEvent.title}
              </h3>
              <p className="text-gray-600 text-sm">{formatDate(selectedEvent.start_date)}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedEvent(null);
                setSelectedRegistrations(new Set());
                setSearchTerm('');
                setStatusFilter('all');
              }}
              data-testid="button-back-to-events"
            >
              ← Back to Events
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card data-testid="stat-total-registered">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Registered</p>
                    <p className="text-2xl font-bold">{selectedEvent.registered_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-checked-in">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Checked In</p>
                    <p className="text-2xl font-bold">{selectedEvent.checked_in_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-waitlist">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Waitlist</p>
                    <p className="text-2xl font-bold">{selectedEvent.waitlist_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-cancelled">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <X className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Cancelled</p>
                    <p className="text-2xl font-bold">{selectedEvent.cancelled_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-members"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="select-status-filter"
                  >
                    <option value="all">All Statuses</option>
                    <option value="registered">Registered</option>
                    <option value="checked_in">Checked In</option>
                    <option value="waitlist">Waitlist</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="pending_approval">Pending Approval</option>
                  </select>
                  <Button
                    variant="outline"
                    onClick={exportToCSV}
                    disabled={filteredRegistrations.length === 0}
                    data-testid="button-export-csv"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  {selectedRegistrations.size > 0 && (
                    <Button
                      onClick={handleBulkCheckIn}
                      data-testid="button-bulk-check-in"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Check In ({selectedRegistrations.size})
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registrations Table */}
          <Card>
            <CardContent className="p-0">
              {registrationsLoading ? (
                <div className="text-center py-12" data-testid="loading-registrations">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading registrations...</p>
                </div>
              ) : filteredRegistrations.length === 0 ? (
                <div className="text-center py-12" data-testid="no-registrations">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Registrations Found</h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No registrations match your filters.'
                      : 'No one has registered for this event yet.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedRegistrations.size === filteredRegistrations.length && filteredRegistrations.length > 0}
                            onChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registered Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRegistrations.map((registration) => (
                        <tr 
                          key={registration.id}
                          data-testid={`registration-row-${registration.id}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedRegistrations.has(registration.id)}
                              onChange={() => toggleSelectRegistration(registration.id)}
                              data-testid={`checkbox-select-${registration.id}`}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-testid={`member-name-${registration.id}`}>
                            {registration.profiles.first_name} {registration.profiles.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" data-testid={`member-email-${registration.id}`}>
                            {registration.profiles.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" data-testid={`member-status-${registration.id}`}>
                            <Badge variant={getStatusBadgeVariant(registration.status)}>
                              {registration.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" data-testid={`member-registered-date-${registration.id}`}>
                            {formatDate(registration.registered_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {registration.status !== 'checked_in' && registration.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                onClick={() => handleCheckIn(registration.id)}
                                data-testid={`button-check-in-${registration.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Check In
                              </Button>
                            )}
                            {registration.status === 'checked_in' && (
                              <span className="text-green-600 font-medium">
                                ✓ Checked In
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Member Committees View Component
interface MemberCommitteesViewProps {
  organizationId: string;
  profileId: string;
}

interface Committee {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  mailing_list_id: string | null;
  is_active: boolean;
  member_count: number;
}

interface CommitteeMembership {
  committee_id: string;
  role: string;
  committee: Committee;
}

function MemberCommitteesView({ organizationId, profileId }: MemberCommitteesViewProps) {
  const [allCommittees, setAllCommittees] = useState<Committee[]>([]);
  const [userMemberships, setUserMemberships] = useState<CommitteeMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommittees = async () => {
      setLoading(true);
      try {
        const [committeesResponse, membershipsResponse] = await Promise.all([
          supabase
            .from('committees')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('committee_members')
            .select('committee_id, role, committees(*)')
            .eq('profile_id', profileId)
        ]);

        if (committeesResponse.error) throw committeesResponse.error;
        if (membershipsResponse.error) throw membershipsResponse.error;

        setAllCommittees(committeesResponse.data || []);
        setUserMemberships(membershipsResponse.data as any || []);
      } catch (error) {
        console.error('Error fetching committees:', error);
        toast.error('Failed to load committees');
      } finally {
        setLoading(false);
      }
    };

    fetchCommittees();
  }, [organizationId, profileId]);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="loading-committees">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const userCommitteeIds = new Set(userMemberships.map(m => m.committee_id));
  const myCommittees = allCommittees.filter(c => userCommitteeIds.has(c.id));
  const otherCommittees = allCommittees.filter(c => !userCommitteeIds.has(c.id));

  const getRoleDisplay = (role: string) => {
    return role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* My Committees Section */}
      {myCommittees.length > 0 && (
        <div data-testid="my-committees-section">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Committees</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myCommittees.map(committee => {
              const membership = userMemberships.find(m => m.committee_id === committee.id);
              return (
                <Card key={committee.id} className="border-l-4 border-l-blue-600" data-testid={`my-committee-${committee.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {committee.name}
                          <Badge variant="default" data-testid={`my-role-${committee.id}`}>
                            {getRoleDisplay(membership?.role || 'member')}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{committee.description || 'No description'}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span data-testid={`member-count-${committee.id}`}>{committee.member_count} member{committee.member_count !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Committees Section */}
      <div data-testid="all-committees-section">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {myCommittees.length > 0 ? 'Other Committees' : 'All Committees'}
        </h2>
        {otherCommittees.length === 0 && myCommittees.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Committees Available</h3>
              <p className="text-gray-600">There are no active committees in this organization.</p>
            </CardContent>
          </Card>
        ) : otherCommittees.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">You're in all committees!</h3>
              <p className="text-gray-600">There are no other committees to join.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {otherCommittees.map(committee => (
              <Card key={committee.id} data-testid={`committee-${committee.id}`}>
                <CardHeader>
                  <CardTitle>{committee.name}</CardTitle>
                  <CardDescription>{committee.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span data-testid={`other-member-count-${committee.id}`}>{committee.member_count} member{committee.member_count !== 1 ? 's' : ''}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Admin Committees View Component
interface AdminCommitteesViewProps {
  organizationId: string;
}

interface CommitteeMember {
  id: string;
  profile_id: string;
  role: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

function AdminCommitteesView({ organizationId }: AdminCommitteesViewProps) {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [mailingLists, setMailingLists] = useState<MailingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);

  const fetchCommittees = async () => {
    try {
      const { data, error } = await supabase
        .from('committees')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setCommittees(data || []);
    } catch (error) {
      console.error('Error fetching committees:', error);
      toast.error('Failed to load committees');
    }
  };

  const fetchMailingLists = async () => {
    try {
      const { data, error } = await supabase
        .from('mailing_lists')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setMailingLists(data || []);
    } catch (error) {
      console.error('Error fetching mailing lists:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchCommittees(), fetchMailingLists()]);
      setLoading(false);
    };

    fetchData();
  }, [organizationId]);

  const handleDelete = async (committeeId: string, committeeName: string) => {
    if (!confirm(`Are you sure you want to delete "${committeeName}"? This will also remove all committee members.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('committees')
        .delete()
        .eq('id', committeeId);

      if (error) throw error;

      toast.success('Committee deleted successfully');
      fetchCommittees();
    } catch (error) {
      console.error('Error deleting committee:', error);
      toast.error('Failed to delete committee');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="loading-admin-committees">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Committees Management</h2>
          <p className="text-gray-600 mt-1">Manage organization committees and their members</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-committee">
          <Plus className="h-4 w-4 mr-2" />
          Create Committee
        </Button>
      </div>

      {committees.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Committees Yet</h3>
            <p className="text-gray-600 mb-4">Create your first committee to get started.</p>
            <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-committee">
              <Plus className="h-4 w-4 mr-2" />
              Create Committee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {committees.map(committee => {
            const linkedMailingList = mailingLists.find(ml => ml.id === committee.mailing_list_id);
            return (
              <Card key={committee.id} data-testid={`admin-committee-${committee.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {committee.name}
                        {!committee.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{committee.description || 'No description'}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4" />
                        <span data-testid={`admin-member-count-${committee.id}`}>{committee.member_count} member{committee.member_count !== 1 ? 's' : ''}</span>
                      </span>
                      {linkedMailingList && (
                        <span className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span data-testid={`mailing-list-${committee.id}`}>{linkedMailingList.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCommittee(committee);
                          setShowMembersModal(true);
                        }}
                        data-testid={`button-view-members-${committee.id}`}
                      >
                        <User className="h-4 w-4 mr-1" />
                        View Members
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCommittee(committee);
                          setShowEditModal(true);
                        }}
                        data-testid={`button-edit-committee-${committee.id}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(committee.id, committee.name)}
                        data-testid={`button-delete-committee-${committee.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateCommitteeModal
          organizationId={organizationId}
          mailingLists={mailingLists}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCommittees();
          }}
        />
      )}

      {showEditModal && selectedCommittee && (
        <EditCommitteeModal
          committee={selectedCommittee}
          mailingLists={mailingLists}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCommittee(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedCommittee(null);
            fetchCommittees();
          }}
        />
      )}

      {showMembersModal && selectedCommittee && (
        <CommitteeMembersModal
          committee={selectedCommittee}
          organizationId={organizationId}
          onClose={() => {
            setShowMembersModal(false);
            setSelectedCommittee(null);
          }}
          onSuccess={() => {
            fetchCommittees();
          }}
        />
      )}
    </div>
  );
}

// Create Committee Modal
interface CreateCommitteeModalProps {
  organizationId: string;
  mailingLists: MailingList[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateCommitteeModal({ organizationId, mailingLists, onClose, onSuccess }: CreateCommitteeModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [mailingListId, setMailingListId] = useState<string>('');
  const [createMailingList, setCreateMailingList] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalMailingListId = mailingListId || null;

      if (createMailingList) {
        const { data: newList, error: listError } = await supabase
          .from('mailing_lists')
          .insert({
            organization_id: organizationId,
            name: `${name} Members`,
            description: `Mailing list for ${name} committee members`,
            is_public: false
          })
          .select()
          .single();

        if (listError) throw listError;
        finalMailingListId = newList.id;
      }

      const { error } = await supabase
        .from('committees')
        .insert({
          organization_id: organizationId,
          name,
          description: description || null,
          slug,
          mailing_list_id: finalMailingListId,
          is_active: true,
          member_count: 0
        });

      if (error) throw error;

      toast.success('Committee created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating committee:', error);
      toast.error('Failed to create committee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="create-committee-modal">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Committee</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-testid="button-close-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Committee Name *</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Social Committee"
              required
              data-testid="input-committee-name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the committee"
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              data-testid="input-committee-description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug *</label>
            <Input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="social-committee"
              required
              data-testid="input-committee-slug"
            />
            <p className="text-xs text-gray-500 mt-1">Used in URLs and identifiers</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mailing List (Optional)</label>
            <select
              value={mailingListId}
              onChange={(e) => {
                setMailingListId(e.target.value);
                if (e.target.value) setCreateMailingList(false);
              }}
              className="w-full px-3 py-2 border rounded-md"
              disabled={createMailingList}
              data-testid="select-mailing-list"
            >
              <option value="">No mailing list</option>
              {mailingLists.map(list => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create-list"
              checked={createMailingList}
              onChange={(e) => {
                setCreateMailingList(e.target.checked);
                if (e.target.checked) setMailingListId('');
              }}
              className="rounded"
              data-testid="checkbox-create-mailing-list"
            />
            <label htmlFor="create-list" className="text-sm">Create linked mailing list</label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} data-testid="button-submit-committee">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Committee
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Committee Modal
interface EditCommitteeModalProps {
  committee: Committee;
  mailingLists: MailingList[];
  onClose: () => void;
  onSuccess: () => void;
}

function EditCommitteeModal({ committee, mailingLists, onClose, onSuccess }: EditCommitteeModalProps) {
  const [name, setName] = useState(committee.name);
  const [description, setDescription] = useState(committee.description || '');
  const [slug, setSlug] = useState(committee.slug);
  const [mailingListId, setMailingListId] = useState<string>(committee.mailing_list_id || '');
  const [isActive, setIsActive] = useState(committee.is_active);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('committees')
        .update({
          name,
          description: description || null,
          slug,
          mailing_list_id: mailingListId || null,
          is_active: isActive
        })
        .eq('id', committee.id);

      if (error) throw error;

      toast.success('Committee updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating committee:', error);
      toast.error('Failed to update committee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="edit-committee-modal">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Committee</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-testid="button-close-edit-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Committee Name *</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-edit-committee-name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              data-testid="input-edit-committee-description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug *</label>
            <Input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              data-testid="input-edit-committee-slug"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mailing List (Optional)</label>
            <select
              value={mailingListId}
              onChange={(e) => setMailingListId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              data-testid="select-edit-mailing-list"
            >
              <option value="">No mailing list</option>
              {mailingLists.map(list => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
              data-testid="checkbox-is-active"
            />
            <label htmlFor="is-active" className="text-sm">Committee is active</label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} data-testid="button-submit-edit-committee">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Committee Members Modal
interface CommitteeMembersModalProps {
  committee: Committee;
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CommitteeMembersModal({ committee, organizationId, onClose, onSuccess }: CommitteeMembersModalProps) {
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [adding, setAdding] = useState(false);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('committee_members')
        .select('id, profile_id, role, profiles(id, first_name, last_name, email)')
        .eq('committee_id', committee.id);

      if (error) throw error;
      setMembers(data as any || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load committee members');
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMembers(), fetchProfiles()]);
      setLoading(false);
    };
    loadData();
  }, [committee.id]);

  const handleAddMember = async () => {
    if (!selectedProfileId) {
      toast.error('Please select a member');
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from('committee_members')
        .insert({
          committee_id: committee.id,
          profile_id: selectedProfileId,
          role: selectedRole
        });

      if (error) throw error;

      await supabase
        .from('committees')
        .update({ member_count: members.length + 1 })
        .eq('id', committee.id);

      toast.success('Member added successfully');
      setShowAddMember(false);
      setSelectedProfileId('');
      setSelectedRole('member');
      await fetchMembers();
      onSuccess();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('committee_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Role updated successfully');
      await fetchMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this committee?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('committee_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await supabase
        .from('committees')
        .update({ member_count: Math.max(0, members.length - 1) })
        .eq('id', committee.id);

      toast.success('Member removed successfully');
      await fetchMembers();
      onSuccess();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const availableProfiles = profiles.filter(
    p => !members.some(m => m.profile_id === p.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="committee-members-modal">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">{committee.name} - Members</h2>
            <p className="text-sm text-gray-600">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-testid="button-close-members-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading members...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              {showAddMember ? (
                <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Member</label>
                    <select
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      data-testid="select-add-member"
                    >
                      <option value="">Choose a member...</option>
                      {availableProfiles.map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.first_name} {profile.last_name} ({profile.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      data-testid="select-member-role"
                    >
                      <option value="member">Member</option>
                      <option value="chair">Chair</option>
                      <option value="vice_chair">Vice Chair</option>
                      <option value="secretary">Secretary</option>
                      <option value="treasurer">Treasurer</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddMember} disabled={adding} data-testid="button-confirm-add-member">
                      {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Add Member
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddMember(false)} data-testid="button-cancel-add-member">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowAddMember(true)} data-testid="button-add-member">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              )}
            </div>

            {members.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Members Yet</h3>
                <p className="text-gray-600">Add members to this committee using the button above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`committee-member-${member.id}`}>
                    <div>
                      <h4 className="font-medium">
                        {member.profiles.first_name} {member.profiles.last_name}
                      </h4>
                      <p className="text-sm text-gray-600">{member.profiles.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.id, e.target.value)}
                        className="px-3 py-1 border rounded-md text-sm"
                        data-testid={`select-role-${member.id}`}
                      >
                        <option value="member">Member</option>
                        <option value="chair">Chair</option>
                        <option value="vice_chair">Vice Chair</option>
                        <option value="secretary">Secretary</option>
                        <option value="treasurer">Treasurer</option>
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveMember(member.id, `${member.profiles.first_name} ${member.profiles.last_name}`)}
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Member Badges View Component
interface MemberBadgesViewProps {
  organizationId: string;
  profileId: string;
}

function MemberBadgesView({ organizationId, profileId }: MemberBadgesViewProps) {
  const [loading, setLoading] = useState(true);
  const [myBadges, setMyBadges] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);

  useEffect(() => {
    fetchBadges();
  }, [organizationId, profileId]);

  const fetchBadges = async () => {
    try {
      setLoading(true);

      const [{ data: allBadgesData }, { data: myBadgesData }] = await Promise.all([
        supabase
          .from('badges')
          .select('*, member_badges(count)')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('member_badges')
          .select('*, badges(*)')
          .eq('profile_id', profileId)
      ]);

      setAllBadges(allBadgesData || []);
      setMyBadges(myBadgesData || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
      toast.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  const hasBadge = (badgeId: string) => {
    return myBadges.some(mb => mb.badge_id === badgeId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="view-member-badges">
      <div>
        <h2 className="text-2xl font-bold mb-1">My Badges</h2>
        <p className="text-gray-600">View your earned achievements and available badges</p>
      </div>

      {/* My Badges Section */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Badges I've Earned</h3>
        {myBadges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBadges.map(memberBadge => (
              <Card key={memberBadge.id} className="hover:shadow-md transition-shadow" data-testid={`card-my-badge-${memberBadge.id}`}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div 
                      className="text-3xl p-2 rounded-lg"
                      style={{ backgroundColor: memberBadge.badges.color || '#e5e7eb' }}
                    >
                      {memberBadge.badges.icon || '🏆'}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`text-badge-name-${memberBadge.id}`}>
                        {memberBadge.badges.name}
                      </CardTitle>
                      <CardDescription data-testid={`text-badge-description-${memberBadge.id}`}>
                        {memberBadge.badges.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Awarded:</span>
                      <span className="font-medium" data-testid={`text-awarded-date-${memberBadge.id}`}>
                        {formatDate(memberBadge.awarded_at)}
                      </span>
                    </div>
                    {memberBadge.notes && (
                      <div className="text-sm">
                        <span className="text-gray-600">Notes:</span>
                        <p className="mt-1 text-gray-700" data-testid={`text-badge-notes-${memberBadge.id}`}>
                          {memberBadge.notes}
                        </p>
                      </div>
                    )}
                    {memberBadge.metadata && Object.keys(memberBadge.metadata).length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600">Details:</span>
                        <div className="mt-1 space-y-1" data-testid={`text-badge-metadata-${memberBadge.id}`}>
                          {Object.entries(memberBadge.metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600">{key}:</span>
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">You haven't earned any badges yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Available Badges Section */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Available Badges</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allBadges.map(badge => {
            const earned = hasBadge(badge.id);
            const memberCount = Array.isArray(badge.member_badges) ? badge.member_badges.length : 0;
            
            return (
              <Card 
                key={badge.id} 
                className={`transition-all ${earned ? 'ring-2 ring-green-500' : 'opacity-75'}`}
                data-testid={`card-available-badge-${badge.id}`}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div 
                      className="text-3xl p-2 rounded-lg relative"
                      style={{ backgroundColor: badge.color || '#e5e7eb' }}
                    >
                      {badge.icon || '🏆'}
                      {earned && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg" data-testid={`text-available-badge-name-${badge.id}`}>
                          {badge.name}
                        </CardTitle>
                        {earned && (
                          <Badge variant="default" className="bg-green-500">Earned</Badge>
                        )}
                      </div>
                      <CardDescription data-testid={`text-available-badge-description-${badge.id}`}>
                        {badge.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Type:</span>
                      <Badge variant="outline" data-testid={`badge-type-${badge.id}`}>
                        {badge.badge_type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Members with badge:</span>
                      <span className="font-medium" data-testid={`text-member-count-${badge.id}`}>
                        {memberCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Admin Badges View Component
interface AdminBadgesViewProps {
  organizationId: string;
}

function AdminBadgesView({ organizationId }: AdminBadgesViewProps) {
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  useEffect(() => {
    fetchBadges();
  }, [organizationId]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('badges')
        .select('*, member_badges(count)')
        .eq('organization_id', organizationId)
        .order('display_order');

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
      toast.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (badgeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('badges')
        .update({ is_active: !currentStatus })
        .eq('id', badgeId);

      if (error) throw error;
      toast.success(`Badge ${currentStatus ? 'deactivated' : 'activated'}`);
      fetchBadges();
    } catch (error) {
      console.error('Error toggling badge status:', error);
      toast.error('Failed to update badge status');
    }
  };

  const handleDelete = async (badgeId: string, badgeName: string) => {
    if (!confirm(`Are you sure you want to delete "${badgeName}"? This will remove all member badges.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', badgeId);

      if (error) throw error;
      toast.success('Badge deleted successfully');
      fetchBadges();
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast.error('Failed to delete badge');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="view-admin-badges">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Badges Management</h2>
          <p className="text-gray-600">Create and manage member badges and achievements</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-badge">
          <Plus className="h-4 w-4 mr-2" />
          Create Badge
        </Button>
      </div>

      {/* Badges List */}
      <div className="space-y-3">
        {badges.map(badge => {
          const memberCount = Array.isArray(badge.member_badges) ? badge.member_badges.length : 0;
          
          return (
            <Card key={badge.id} data-testid={`card-badge-${badge.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div 
                    className="text-3xl p-3 rounded-lg"
                    style={{ backgroundColor: badge.color || '#e5e7eb' }}
                  >
                    {badge.icon || '🏆'}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg" data-testid={`text-badge-name-${badge.id}`}>
                        {badge.name}
                      </h3>
                      <Badge variant="outline" data-testid={`badge-type-${badge.id}`}>
                        {badge.badge_type}
                      </Badge>
                      {badge.is_active ? (
                        <Badge variant="default" data-testid={`badge-status-${badge.id}`}>Active</Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-status-${badge.id}`}>Inactive</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2" data-testid={`text-badge-description-${badge.id}`}>
                      {badge.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span data-testid={`text-member-count-${badge.id}`}>
                        <Users className="h-4 w-4 inline mr-1" />
                        {memberCount} members
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBadge(badge);
                        setShowAwardModal(true);
                      }}
                      data-testid={`button-award-badge-${badge.id}`}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Award
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBadge(badge);
                        setShowMembersModal(true);
                      }}
                      data-testid={`button-view-members-${badge.id}`}
                    >
                      View Members
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBadge(badge);
                        setShowEditModal(true);
                      }}
                      data-testid={`button-edit-badge-${badge.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(badge.id, badge.is_active)}
                      data-testid={`button-toggle-active-${badge.id}`}
                    >
                      {badge.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(badge.id, badge.name)}
                      data-testid={`button-delete-badge-${badge.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {badges.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">No badges created yet</p>
              <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-badge">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Badge
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateEditBadgeModal
          organizationId={organizationId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchBadges();
          }}
        />
      )}

      {showEditModal && selectedBadge && (
        <CreateEditBadgeModal
          organizationId={organizationId}
          badge={selectedBadge}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBadge(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedBadge(null);
            fetchBadges();
          }}
        />
      )}

      {showAwardModal && selectedBadge && (
        <AwardBadgeModal
          organizationId={organizationId}
          badge={selectedBadge}
          onClose={() => {
            setShowAwardModal(false);
            setSelectedBadge(null);
          }}
          onSuccess={() => {
            setShowAwardModal(false);
            setSelectedBadge(null);
            fetchBadges();
          }}
        />
      )}

      {showMembersModal && selectedBadge && (
        <ViewBadgeMembersModal
          badge={selectedBadge}
          onClose={() => {
            setShowMembersModal(false);
            setSelectedBadge(null);
          }}
          onSuccess={() => {
            fetchBadges();
          }}
        />
      )}
    </div>
  );
}

// Create/Edit Badge Modal
interface CreateEditBadgeModalProps {
  organizationId: string;
  badge?: any;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEditBadgeModal({ organizationId, badge, onClose, onSuccess }: CreateEditBadgeModalProps) {
  const [formData, setFormData] = useState({
    name: badge?.name || '',
    description: badge?.description || '',
    icon: badge?.icon || '🏆',
    color: badge?.color || '#3B82F6',
    badge_type: badge?.badge_type || 'manual',
    criteria: badge?.criteria ? JSON.stringify(badge.criteria, null, 2) : '',
    is_active: badge?.is_active ?? true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let criteria = null;
      if (formData.criteria.trim()) {
        try {
          criteria = JSON.parse(formData.criteria);
        } catch (e) {
          toast.error('Invalid JSON in criteria field');
          setLoading(false);
          return;
        }
      }

      const badgeData = {
        organization_id: organizationId,
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        badge_type: formData.badge_type,
        criteria,
        is_active: formData.is_active,
        display_order: badge?.display_order || 0
      };

      if (badge) {
        const { error } = await supabase
          .from('badges')
          .update(badgeData)
          .eq('id', badge.id);

        if (error) throw error;
        toast.success('Badge updated successfully');
      } else {
        const { error } = await supabase
          .from('badges')
          .insert(badgeData);

        if (error) throw error;
        toast.success('Badge created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving badge:', error);
      toast.error('Failed to save badge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="modal-create-edit-badge">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{badge ? 'Edit Badge' : 'Create New Badge'}</CardTitle>
          <CardDescription>
            {badge ? 'Update badge details' : 'Create a new achievement badge for members'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Founding Member"
                required
                data-testid="input-badge-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the badge"
                required
                data-testid="input-badge-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Icon (Emoji or Icon Name)</label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🏆 or Award"
                  data-testid="input-badge-icon"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Color (Hex or Color Name)</label>
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6 or blue"
                  data-testid="input-badge-color"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Badge Type *</label>
              <select
                value={formData.badge_type}
                onChange={(e) => setFormData({ ...formData, badge_type: e.target.value })}
                className="w-full p-2 border rounded"
                data-testid="select-badge-type"
              >
                <option value="manual">Manual - Awarded by admins</option>
                <option value="automatic">Automatic - Based on criteria</option>
                <option value="milestone">Milestone - Achievement based</option>
              </select>
            </div>

            {formData.badge_type === 'automatic' && (
              <div>
                <label className="text-sm font-medium">Criteria (JSON)</label>
                <textarea
                  value={formData.criteria}
                  onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                  placeholder='{"years_member": 5, "events_attended": 10}'
                  className="w-full p-2 border rounded font-mono text-sm"
                  rows={4}
                  data-testid="input-badge-criteria"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                data-testid="checkbox-badge-active"
              />
              <label htmlFor="is_active" className="text-sm font-medium">Active</label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading} data-testid="button-cancel-badge">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} data-testid="button-save-badge">
                {loading ? 'Saving...' : badge ? 'Update Badge' : 'Create Badge'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Award Badge Modal
interface AwardBadgeModalProps {
  organizationId: string;
  badge: any;
  onClose: () => void;
  onSuccess: () => void;
}

function AwardBadgeModal({ organizationId, badge, onClose, onSuccess }: AwardBadgeModalProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [metadata, setMetadata] = useState('');
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member =>
    `${member.first_name} ${member.last_name} ${member.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleAward = async () => {
    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }

    setAwarding(true);

    try {
      let parsedMetadata = null;
      if (metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (e) {
          toast.error('Invalid JSON in metadata field');
          setAwarding(false);
          return;
        }
      }

      const { error } = await supabase
        .from('member_badges')
        .insert({
          badge_id: badge.id,
          profile_id: selectedMember.id,
          awarded_at: new Date().toISOString(),
          notes: notes || null,
          metadata: parsedMetadata
        });

      if (error) throw error;
      toast.success(`Badge awarded to ${selectedMember.first_name} ${selectedMember.last_name}`);
      onSuccess();
    } catch (error: any) {
      console.error('Error awarding badge:', error);
      if (error.code === '23505') {
        toast.error('This member already has this badge');
      } else {
        toast.error('Failed to award badge');
      }
    } finally {
      setAwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="modal-award-badge">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Award Badge: {badge.name}</CardTitle>
          <CardDescription>Select a member to award this badge to</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Search Members</label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              data-testid="input-search-members"
            />
          </div>

          <div className="border rounded max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">Loading members...</div>
            ) : filteredMembers.length > 0 ? (
              <div className="divide-y">
                {filteredMembers.map(member => (
                  <div
                    key={member.id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedMember?.id === member.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedMember(member)}
                    data-testid={`member-option-${member.id}`}
                  >
                    <div className="font-medium">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-sm text-gray-600">{member.email}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">No members found</div>
            )}
          </div>

          {selectedMember && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="font-medium">Selected:</div>
              <div>{selectedMember.first_name} {selectedMember.last_name}</div>
              <div className="text-sm text-gray-600">{selectedMember.email}</div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this award..."
              className="w-full p-2 border rounded"
              rows={3}
              data-testid="input-award-notes"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Metadata (Optional JSON)</label>
            <textarea
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder='{"certification_number": "12345", "date": "2025-10-02"}'
              className="w-full p-2 border rounded font-mono text-sm"
              rows={3}
              data-testid="input-award-metadata"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={awarding} data-testid="button-cancel-award">
              Cancel
            </Button>
            <Button onClick={handleAward} disabled={awarding || !selectedMember} data-testid="button-submit-award">
              {awarding ? 'Awarding...' : 'Award Badge'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// View Badge Members Modal
interface ViewBadgeMembersModalProps {
  badge: any;
  onClose: () => void;
  onSuccess: () => void;
}

function ViewBadgeMembersModal({ badge, onClose, onSuccess }: ViewBadgeMembersModalProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadgeMembers();
  }, [badge.id]);

  const fetchBadgeMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('member_badges')
        .select('*, profiles(*)')
        .eq('badge_id', badge.id)
        .order('awarded_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching badge members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberBadgeId: string, memberName: string) => {
    if (!confirm(`Remove badge from ${memberName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('member_badges')
        .delete()
        .eq('id', memberBadgeId);

      if (error) throw error;
      toast.success('Badge removed from member');
      fetchBadgeMembers();
      onSuccess();
    } catch (error) {
      console.error('Error removing badge:', error);
      toast.error('Failed to remove badge');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="modal-view-badge-members">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Members with Badge: {badge.name}</CardTitle>
          <CardDescription>{members.length} members have earned this badge</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading members...</div>
          ) : members.length > 0 ? (
            <div className="space-y-3">
              {members.map(memberBadge => (
                <div
                  key={memberBadge.id}
                  className="flex items-center justify-between p-4 border rounded"
                  data-testid={`member-badge-${memberBadge.id}`}
                >
                  <div className="flex-1">
                    <div className="font-medium" data-testid={`text-member-name-${memberBadge.id}`}>
                      {memberBadge.profiles.first_name} {memberBadge.profiles.last_name}
                    </div>
                    <div className="text-sm text-gray-600">{memberBadge.profiles.email}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Awarded: {formatDate(memberBadge.awarded_at)}
                    </div>
                    {memberBadge.notes && (
                      <div className="text-sm text-gray-700 mt-1">
                        Notes: {memberBadge.notes}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemove(memberBadge.id, `${memberBadge.profiles.first_name} ${memberBadge.profiles.last_name}`)}
                    data-testid={`button-remove-badge-${memberBadge.id}`}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No members have this badge yet
            </div>
          )}

          <div className="flex justify-end pt-4 border-t mt-4">
            <Button onClick={onClose} data-testid="button-close-members">Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Analytics View Component
interface AnalyticsViewProps {
  organizationId: string;
  primaryColor?: string;
}

function AnalyticsView({ organizationId, primaryColor = '#3B82F6' }: AnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalMembers: 0,
    activeMemberships: 0,
    upcomingEvents: 0,
    recentRegistrations: 0
  });
  const [membershipTrends, setMembershipTrends] = useState<any[]>([]);
  const [membershipByType, setMembershipByType] = useState<any[]>([]);
  const [eventAttendance, setEventAttendance] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (organizationId) {
      fetchAnalyticsData();
    }
  }, [organizationId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        { count: totalMembers },
        { count: activeMemberships },
        { data: upcomingEventsData },
        { data: recentRegistrationsData },
        { data: allMemberships },
        { data: membershipTypes },
        { data: eventsData },
        { data: recentProfiles }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true),
        
        supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'active'),
        
        supabase
          .from('events')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_published', true)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true }),
        
        supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        
        supabase
          .from('memberships')
          .select('*')
          .eq('organization_id', organizationId),
        
        supabase
          .from('organization_membership_types')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true),
        
        supabase
          .from('events')
          .select('*, event_registrations(count)')
          .eq('organization_id', organizationId)
          .eq('is_published', true)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(10),
        
        supabase
          .from('profiles')
          .select('*, memberships(membership_type)')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      setStatsData({
        totalMembers: totalMembers || 0,
        activeMemberships: activeMemberships || 0,
        upcomingEvents: upcomingEventsData?.length || 0,
        recentRegistrations: recentRegistrationsData?.length || 0
      });

      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(new Date(), 11 - i);
        return {
          month: format(date, 'MMM yyyy'),
          startDate: startOfMonth(date),
          endDate: endOfMonth(date)
        };
      });

      const trendsData = last12Months.map(({ month, startDate, endDate }) => {
        const membershipsInMonth = allMemberships?.filter(m => {
          const createdDate = new Date(m.created_at);
          return isWithinInterval(createdDate, { start: startDate, end: endDate });
        }) || [];

        return {
          month,
          active: membershipsInMonth.filter(m => m.status === 'active').length,
          expired: membershipsInMonth.filter(m => m.status === 'expired').length,
          pending: membershipsInMonth.filter(m => m.status === 'pending').length
        };
      });
      setMembershipTrends(trendsData);

      const typeDistribution = membershipTypes?.map(type => {
        const count = allMemberships?.filter(m => m.membership_type_id === type.id).length || 0;
        return {
          name: type.name,
          value: count,
          price: parseFloat(type.price)
        };
      }).filter(item => item.value > 0) || [];
      setMembershipByType(typeDistribution);

      const eventStats = eventsData?.map(event => ({
        name: event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title,
        registrations: event.event_registrations?.[0]?.count || 0,
        capacity: event.max_attendees || 0,
        date: format(new Date(event.start_date), 'MMM dd')
      })) || [];
      setEventAttendance(eventStats);

      const activityData = recentProfiles?.map(profile => ({
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        membershipType: profile.memberships?.[0]?.membership_type || 'N/A',
        date: format(new Date(profile.created_at), 'MMM dd, yyyy')
      })) || [];
      setRecentActivity(activityData);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const CHART_COLORS = [primaryColor, '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">View comprehensive insights and metrics</p>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card data-testid="stat-total-members">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Members</p>
                <p className="text-3xl font-bold mt-2" data-testid="stat-total-members-value">{statsData.totalMembers}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: `${primaryColor}20` }}>
                <Users className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-active-memberships">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Memberships</p>
                <p className="text-3xl font-bold mt-2" data-testid="stat-active-memberships-value">{statsData.activeMemberships}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-upcoming-events">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Upcoming Events</p>
                <p className="text-3xl font-bold mt-2" data-testid="stat-upcoming-events-value">{statsData.upcomingEvents}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-recent-registrations">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">New Members (30d)</p>
                <p className="text-3xl font-bold mt-2" data-testid="stat-recent-registrations-value">{statsData.recentRegistrations}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <UserPlus className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership Trends Chart */}
      <Card data-testid="chart-membership-trends">
        <CardHeader>
          <CardTitle>Membership Trends</CardTitle>
          <CardDescription>Last 12 months membership status overview</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={membershipTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="active" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Active"
                data-testid="line-active"
              />
              <Line 
                type="monotone" 
                dataKey="expired" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Expired"
                data-testid="line-expired"
              />
              <Line 
                type="monotone" 
                dataKey="pending" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="Pending"
                data-testid="line-pending"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Row - Pie Chart and Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membership by Type Pie Chart */}
        <Card data-testid="chart-membership-by-type">
          <CardHeader>
            <CardTitle>Membership Distribution</CardTitle>
            <CardDescription>By membership type</CardDescription>
          </CardHeader>
          <CardContent>
            {membershipByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={membershipByType}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill={primaryColor}
                    dataKey="value"
                  >
                    {membershipByType.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No membership data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Attendance Bar Chart */}
        <Card data-testid="chart-event-attendance">
          <CardHeader>
            <CardTitle>Event Registrations</CardTitle>
            <CardDescription>Upcoming events attendance</CardDescription>
          </CardHeader>
          <CardContent>
            {eventAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventAttendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="registrations" fill={primaryColor} name="Registered" />
                  <Bar dataKey="capacity" fill="#E5E7EB" name="Capacity" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No upcoming events
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card data-testid="table-recent-activity">
        <CardHeader>
          <CardTitle>Recent Member Signups</CardTitle>
          <CardDescription>Latest member registrations</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Membership Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((activity, index) => (
                    <tr key={activity.id} className="border-b hover:bg-gray-50" data-testid={`activity-row-${index}`}>
                      <td className="py-3 px-4" data-testid={`activity-name-${index}`}>{activity.name}</td>
                      <td className="py-3 px-4" data-testid={`activity-email-${index}`}>{activity.email}</td>
                      <td className="py-3 px-4" data-testid={`activity-type-${index}`}>{activity.membershipType}</td>
                      <td className="py-3 px-4" data-testid={`activity-date-${index}`}>{activity.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No recent activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Reminders View Component
interface AdminRemindersViewProps {
  organizationId: string;
}

function AdminRemindersView({ organizationId }: AdminRemindersViewProps) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);
  const [stats, setStats] = useState({
    totalActive: 0,
    sentLast30Days: 0,
    successRate: 0,
    failedCount: 0
  });

  useEffect(() => {
    fetchReminders();
    fetchStats();
  }, [organizationId]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('automated_reminders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [remindersResult, logsResult] = await Promise.all([
        supabase
          .from('automated_reminders')
          .select('is_active')
          .eq('organization_id', organizationId),
        supabase
          .from('reminder_logs')
          .select('status, reminder_id')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .in('reminder_id', 
            (await supabase
              .from('automated_reminders')
              .select('id')
              .eq('organization_id', organizationId))
              .data?.map(r => r.id) || []
          )
      ]);

      const totalActive = remindersResult.data?.filter(r => r.is_active).length || 0;
      const logs = logsResult.data || [];
      const sentLast30Days = logs.length;
      const successCount = logs.filter(l => l.status === 'sent').length;
      const failedCount = logs.filter(l => l.status === 'failed').length;
      const successRate = sentLast30Days > 0 ? (successCount / sentLast30Days) * 100 : 0;

      setStats({
        totalActive,
        sentLast30Days,
        successRate,
        failedCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleToggleActive = async (reminderId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('automated_reminders')
        .update({ is_active: !currentStatus })
        .eq('id', reminderId);

      if (error) throw error;

      toast.success(`Reminder ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchReminders();
      fetchStats();
    } catch (error) {
      console.error('Error toggling reminder:', error);
      toast.error('Failed to update reminder status');
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const { error } = await supabase
        .from('automated_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;

      toast.success('Reminder deleted successfully');
      fetchReminders();
      fetchStats();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
    }
  };

  const getReminderTypeBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      membership_renewal: { color: 'bg-blue-100 text-blue-800', label: 'Membership Renewal' },
      membership_expiry: { color: 'bg-red-100 text-red-800', label: 'Membership Expiry' },
      event_upcoming: { color: 'bg-green-100 text-green-800', label: 'Event Upcoming' },
      event_followup: { color: 'bg-purple-100 text-purple-800', label: 'Event Follow-up' },
      custom: { color: 'bg-gray-100 text-gray-800', label: 'Custom' }
    };

    const { color, label } = config[type] || config.custom;
    return <Badge className={color} data-testid={`badge-type-${type}`}>{label}</Badge>;
  };

  const getTriggerDaysText = (days: number) => {
    if (days === 0) return 'On the day';
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} after`;
    return `${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''} before`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} data-testid={`skeleton-stat-${i}`}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card data-testid="card-total-active">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600">Total Active Reminders</p>
            <p className="text-3xl font-bold text-gray-900 mt-2" data-testid="stat-total-active">{stats.totalActive}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-sent-30days">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600">Sent (Last 30 Days)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2" data-testid="stat-sent-30days">{stats.sentLast30Days}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-success-rate">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600">Success Rate</p>
            <p className="text-3xl font-bold text-green-600 mt-2" data-testid="stat-success-rate">
              {stats.successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card data-testid="card-failed-count">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600">Failed Reminders</p>
            <p className="text-3xl font-bold text-red-600 mt-2" data-testid="stat-failed-count">{stats.failedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" data-testid="heading-reminders">Automated Reminders</h2>
          <p className="text-gray-600 mt-1">Manage automated email reminders for your members</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          data-testid="button-create-reminder"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Reminder
        </Button>
      </div>

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No reminders configured yet. Click "Create Reminder" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <Card key={reminder.id} data-testid={`reminder-card-${reminder.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold" data-testid={`reminder-name-${reminder.id}`}>
                        {reminder.name}
                      </h3>
                      {getReminderTypeBadge(reminder.reminder_type)}
                      <Badge 
                        variant={reminder.is_active ? 'default' : 'secondary'}
                        data-testid={`reminder-status-${reminder.id}`}
                      >
                        {reminder.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {reminder.description && (
                      <p className="text-gray-600 text-sm mb-3" data-testid={`reminder-description-${reminder.id}`}>
                        {reminder.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span data-testid={`reminder-trigger-${reminder.id}`}>
                        <Clock className="h-4 w-4 inline mr-1" />
                        {getTriggerDaysText(reminder.trigger_days)}
                      </span>
                      <span data-testid={`reminder-subject-${reminder.id}`}>
                        <Mail className="h-4 w-4 inline mr-1" />
                        {reminder.email_subject}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <label className="flex items-center cursor-pointer" data-testid={`toggle-active-${reminder.id}`}>
                      <input
                        type="checkbox"
                        checked={reminder.is_active}
                        onChange={() => handleToggleActive(reminder.id, reminder.is_active)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedReminder(reminder);
                        setShowLogsModal(true);
                      }}
                      data-testid={`button-view-logs-${reminder.id}`}
                    >
                      View Logs
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedReminder(reminder);
                        setShowEditModal(true);
                      }}
                      data-testid={`button-edit-${reminder.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(reminder.id)}
                      data-testid={`button-delete-${reminder.id}`}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <ReminderFormModal
          organizationId={organizationId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchReminders();
            fetchStats();
          }}
        />
      )}

      {/* Edit Reminder Modal */}
      {showEditModal && selectedReminder && (
        <ReminderFormModal
          organizationId={organizationId}
          reminder={selectedReminder}
          onClose={() => {
            setShowEditModal(false);
            setSelectedReminder(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedReminder(null);
            fetchReminders();
            fetchStats();
          }}
        />
      )}

      {/* View Logs Modal */}
      {showLogsModal && selectedReminder && (
        <ReminderLogsModal
          reminderId={selectedReminder.id}
          reminderName={selectedReminder.name}
          onClose={() => {
            setShowLogsModal(false);
            setSelectedReminder(null);
          }}
        />
      )}
    </div>
  );
}

// Reminder Form Modal Component
interface ReminderFormModalProps {
  organizationId: string;
  reminder?: any;
  onClose: () => void;
  onSuccess: () => void;
}

function ReminderFormModal({ organizationId, reminder, onClose, onSuccess }: ReminderFormModalProps) {
  const [formData, setFormData] = useState({
    name: reminder?.name || '',
    description: reminder?.description || '',
    reminder_type: reminder?.reminder_type || 'membership_renewal',
    trigger_days: reminder?.trigger_days || 0,
    email_subject: reminder?.email_subject || '',
    email_body: reminder?.email_body || '',
    target_audience: reminder?.target_audience ? JSON.stringify(reminder.target_audience, null, 2) : '{}',
    is_active: reminder?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let targetAudience = null;
      try {
        targetAudience = JSON.parse(formData.target_audience);
      } catch {
        toast.error('Invalid JSON in target audience field');
        setSaving(false);
        return;
      }

      const data = {
        organization_id: organizationId,
        name: formData.name,
        description: formData.description || null,
        reminder_type: formData.reminder_type,
        trigger_days: parseInt(formData.trigger_days.toString()),
        email_subject: formData.email_subject,
        email_body: formData.email_body,
        target_audience: targetAudience,
        is_active: formData.is_active
      };

      if (reminder) {
        const { error } = await supabase
          .from('automated_reminders')
          .update(data)
          .eq('id', reminder.id);

        if (error) throw error;
        toast.success('Reminder updated successfully');
      } else {
        const { error } = await supabase
          .from('automated_reminders')
          .insert(data);

        if (error) throw error;
        toast.success('Reminder created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving reminder:', error);
      toast.error('Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle data-testid="modal-title-reminder">
            {reminder ? 'Edit' : 'Create'} Reminder
          </CardTitle>
          <CardDescription>
            Configure automated email reminders for your members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium" data-testid="label-name">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium" data-testid="label-description">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-description"
              />
            </div>

            <div>
              <label className="text-sm font-medium" data-testid="label-type">Reminder Type</label>
              <select
                value={formData.reminder_type}
                onChange={(e) => setFormData({ ...formData, reminder_type: e.target.value })}
                className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2"
                data-testid="select-type"
              >
                <option value="membership_renewal">Membership Renewal</option>
                <option value="membership_expiry">Membership Expiry</option>
                <option value="event_upcoming">Event Upcoming</option>
                <option value="event_followup">Event Follow-up</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium" data-testid="label-trigger-days">
                Trigger Days (negative for "before", positive for "after")
              </label>
              <Input
                type="number"
                value={formData.trigger_days}
                onChange={(e) => setFormData({ ...formData, trigger_days: parseInt(e.target.value) || 0 })}
                required
                data-testid="input-trigger-days"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: -7 = 7 days before, 3 = 3 days after
              </p>
            </div>

            <div>
              <label className="text-sm font-medium" data-testid="label-subject">Email Subject (max 500 chars)</label>
              <Input
                value={formData.email_subject}
                onChange={(e) => setFormData({ ...formData, email_subject: e.target.value.slice(0, 500) })}
                required
                maxLength={500}
                data-testid="input-subject"
              />
            </div>

            <div>
              <label className="text-sm font-medium" data-testid="label-body">Email Body</label>
              <Textarea
                value={formData.email_body}
                onChange={(e) => setFormData({ ...formData, email_body: e.target.value })}
                rows={8}
                required
                data-testid="textarea-body"
              />
              <p className="text-xs text-gray-500 mt-1">
                Template variables: &#123;&#123;first_name&#125;&#125;, &#123;&#123;last_name&#125;&#125;, &#123;&#123;organization_name&#125;&#125;, &#123;&#123;expiry_date&#125;&#125;
              </p>
            </div>

            <div>
              <label className="text-sm font-medium" data-testid="label-target-audience">
                Target Audience (JSON, optional filters)
              </label>
              <Textarea
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                rows={4}
                data-testid="textarea-target-audience"
                placeholder='{"membership_type": "individual", "status": "active"}'
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4"
                data-testid="checkbox-active"
              />
              <label htmlFor="is_active" className="text-sm font-medium">Active</label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} data-testid="button-save">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {reminder ? 'Update' : 'Create'} Reminder
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Reminder Logs Modal Component
interface ReminderLogsModalProps {
  reminderId: string;
  reminderName: string;
  onClose: () => void;
}

function ReminderLogsModal({ reminderId, reminderName, onClose }: ReminderLogsModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const logsPerPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [reminderId, statusFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('reminder_logs')
        .select(`
          *,
          profiles:profile_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('reminder_id', reminderId)
        .order('sent_at', { ascending: false })
        .limit(logsPerPage);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load reminder logs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      sent: { color: 'bg-green-100 text-green-800', label: 'Sent' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      bounced: { color: 'bg-orange-100 text-orange-800', label: 'Bounced' },
      opened: { color: 'bg-blue-100 text-blue-800', label: 'Opened' },
      clicked: { color: 'bg-purple-100 text-purple-800', label: 'Clicked' }
    };

    const { color, label } = config[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={color}>{label}</Badge>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle data-testid="modal-title-logs">Reminder Logs: {reminderName}</CardTitle>
          <CardDescription>Last 50 reminder logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="text-sm font-medium mr-2">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1"
              data-testid="select-status-filter"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="bounced">Bounced</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No logs found for this reminder
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-logs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Member</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Sent Date/Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50" data-testid={`log-row-${index}`}>
                      <td className="py-3 px-4" data-testid={`log-member-${index}`}>
                        {log.profiles?.first_name} {log.profiles?.last_name}
                      </td>
                      <td className="py-3 px-4" data-testid={`log-email-${index}`}>
                        {log.profiles?.email}
                      </td>
                      <td className="py-3 px-4" data-testid={`log-date-${index}`}>
                        {format(new Date(log.sent_at), 'PPp')}
                      </td>
                      <td className="py-3 px-4" data-testid={`log-status-${index}`}>
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-3 px-4 text-red-600 text-sm" data-testid={`log-error-${index}`}>
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={onClose} data-testid="button-close-logs">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
