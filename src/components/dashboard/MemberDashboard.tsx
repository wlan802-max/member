import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Loader2
} from 'lucide-react'
import { FormBuilder } from '@/components/admin/FormBuilder'
import { MembershipTypesEditor } from '@/components/admin/MembershipTypesEditor'
import { EmailWorkflowsManager } from '@/components/admin/EmailWorkflowsManager'
import { DynamicFormRenderer } from '@/components/forms/DynamicFormRenderer'

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
  const [activeView, setActiveView] = useState<'dashboard' | 'profile' | 'events' | 'messages' | 'admin-members' | 'admin-settings' | 'admin-mailing' | 'admin-forms' | 'admin-memberships' | 'admin-workflows'>('dashboard')
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
      {activeView === 'events' && organization && (
        <EventsView organizationId={organization.id} onBack={() => setActiveView('dashboard')} />
      )}

      {/* Messages View */}
      {activeView === 'messages' && organization && (
        <MessagesView organizationId={organization.id} onBack={() => setActiveView('dashboard')} />
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
  organizationName,
  organizationSlug,
  profileId,
  profileEmail,
  profileFirstName,
  profileLastName,
  renewalFormSchemaId,
  logoUrl,
  primaryColor,
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
}

function EventsView({ organizationId, onBack }: EventsViewProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [organizationId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_published', true)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events', {
          description: error.message
        });
        setEvents([]);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching events:', err);
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
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
          <CardDescription>View organization events and activities</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Upcoming Events</h3>
              <p className="text-gray-600">
                There are currently no upcoming events scheduled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid={`event-card-${event.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    {event.registration_url && (
                      <Button 
                        size="sm" 
                        onClick={() => window.open(event.registration_url!, '_blank')}
                        data-testid={`button-register-${event.id}`}
                      >
                        Register
                      </Button>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-gray-600 mb-2">{event.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatEventDate(event.start_date, event.end_date)}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <span>📍</span>
                        {event.location}
                      </div>
                    )}
                    {event.max_attendees && (
                      <div className="flex items-center gap-1">
                        <span>👥</span>
                        Max {event.max_attendees} attendees
                      </div>
                    )}
                  </div>
                </div>
              ))}
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

// Mailing Admin View Component
interface MailingAdminViewProps {
  organizationId: string;
}

function MailingAdminView({ organizationId }: MailingAdminViewProps) {
  const [tab, setTab] = useState<'subscribers' | 'campaigns'>('subscribers');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mailing List Management</h2>
        <p className="text-gray-600 mt-1">Manage subscribers and email campaigns</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
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

      {tab === 'subscribers' && <SubscribersView organizationId={organizationId} />}
      {tab === 'campaigns' && <CampaignsView organizationId={organizationId} />}
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
          <strong>Resend Integration Required:</strong> To send email campaigns, set up the Resend integration from the Replit integrations panel. This will allow you to send professional emails to your subscribers.
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
