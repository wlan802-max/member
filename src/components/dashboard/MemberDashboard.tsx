import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  const { user, isAdmin } = useAuth()
  const { organization } = useTenant()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'dashboard' | 'profile' | 'events' | 'messages' | 'admin-members' | 'admin-settings'>('dashboard')

  useEffect(() => {
    // Check URL hash for navigation
    const hash = window.location.hash.replace('#', '')
    if (hash === 'admin' && isAdmin) {
      setActiveView('admin-members')
      window.location.hash = '' // Clear hash after navigation
    }
  }, [isAdmin])

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
                onClick={() => alert('Renew Membership feature coming soon!')}
                data-testid="button-renew-membership"
                style={{ backgroundColor: organization?.primary_color || '#3B82F6' }}
              >
                Renew Membership
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => alert('Digital Cards feature coming soon!')}
          data-testid="card-digital-cards"
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
                  onClick={() => alert('Adding to Google Wallet...')}
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
                  onClick={() => alert('Downloading for Apple Wallet...')}
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
                      onClick={() => alert(`Viewing details for ${membership.membership_year} membership`)}
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

      {/* Admin - Members View */}
      {activeView === 'admin-members' && isAdmin && (
        <MembersAdminView organizationId={organization?.id || ''} />
      )}

      {/* Admin - Settings View */}
      {activeView === 'admin-settings' && isAdmin && organization && (
        <SettingsAdminView organization={organization} />
      )}
    </div>
  )
}

// Members Admin View Component
interface MembersAdminViewProps {
  organizationId: string;
}

function MembersAdminView({ organizationId }: MembersAdminViewProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showEditMember, setShowEditMember] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
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
            <p className="text-center text-gray-500 py-8">No members found</p>
          )}
        </div>
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
    secondary_color: organization.secondary_color || '#1E40AF'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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

        <div className="flex justify-end pt-4">
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

function AddMemberModal({ organizationId: _organizationId, onClose, onSuccess: _onSuccess }: AddMemberModalProps) {
  const [formData, setFormData] = useState({
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
      // Note: In a real implementation, you would also create a Supabase Auth user
      // For now, we'll just create the profile (this will fail without a user_id)
      alert('Add member functionality requires Supabase Auth integration. Please create the user in Supabase Auth first, then add their profile here.');
      onClose();
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="modal-add-member">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Add New Member</CardTitle>
          <CardDescription>Create a new member account</CardDescription>
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
              <label className="text-sm font-medium">Phone (optional)</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-phone"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2 border rounded"
                data-testid="select-role"
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
              <Button type="button" variant="outline" onClick={onClose} disabled={loading} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} data-testid="button-submit-add">
                {loading ? 'Adding...' : 'Add Member'}
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