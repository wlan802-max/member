'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { Building2, Users, Plus, Search, Settings, Eye, CreditCard as Edit, Trash2, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  member_count?: number;
}

export function SuperAdminDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setError(null);
      console.log('Fetching organizations from database...');

      const { data, error: dbError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('Database error fetching organizations:', dbError);
        setError(`Database error: ${dbError.message}. Please ensure RLS policies are set up correctly.`);
        return;
      }

      console.log('Fetched organizations:', data);

      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .eq('is_active', true);

          return {
            ...org,
            member_count: count || 0
          };
        })
      );

      setOrganizations(orgsWithCounts);
      console.log('Organizations loaded successfully:', orgsWithCounts.length);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setError(`Failed to load organizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMembers = organizations.reduce((sum, org) => sum + (org.member_count || 0), 0);
  const activeOrganizations = organizations.filter(org => org.is_active).length;

  const handleEditOrg = async (org: Organization) => {
    setSelectedOrg(org);
    setShowEditForm(true);
  };

  const handleViewOrg = (org: Organization) => {
    setSelectedOrg(org);
    setShowViewDetails(true);
  };

  const handleDeleteClick = (org: Organization) => {
    setSelectedOrg(org);
    setShowDeleteConfirm(true);
  };

  const handleDeleteOrg = async () => {
    if (!selectedOrg) return;
    
    setActionLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('organizations')
        .update({ is_active: false })
        .eq('id', selectedOrg.id);

      if (deleteError) throw deleteError;

      await fetchOrganizations();
      setShowDeleteConfirm(false);
      setSelectedOrg(null);
    } catch (error) {
      console.error('Error deactivating organization:', error);
      setError(`Failed to deactivate organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateOrg = async (formData: Partial<Organization>) => {
    if (!selectedOrg) return;

    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          slug: formData.slug,
          domain: formData.domain,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrg.id);

      if (updateError) throw updateError;

      await fetchOrganizations();
      setShowEditForm(false);
      setSelectedOrg(null);
    } catch (error) {
      console.error('Error updating organization:', error);
      setError(`Failed to update organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage all organizations and system settings</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)} 
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-create-organization"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Error Loading Organizations</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-3">
                <Button
                  onClick={() => fetchOrganizations()}
                  variant="outline"
                  className="text-sm"
                  data-testid="button-retry-load-orgs"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeOrganizations} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Across all organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              Currently operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-organizations"
          />
        </div>
      </div>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            Manage all organizations in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrganizations.map((org) => (
              <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: org.primary_color }}
                  >
                    {org.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{org.name}</h3>
                      <Badge variant={org.is_active ? 'default' : 'secondary'}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{org.slug}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{org.contact_email}</span>
                      </div>
                      {org.contact_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{org.contact_phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{org.member_count || 0} members</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Created {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewOrg(org)}
                    data-testid={`button-view-org-${org.id}`}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditOrg(org)}
                    data-testid={`button-edit-org-${org.id}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteClick(org)}
                    data-testid={`button-delete-org-${org.id}`}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Organization Modal */}
      {showCreateForm && (
        <CreateOrganizationModal 
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchOrganizations();
          }}
        />
      )}

      {/* Edit Organization Modal */}
      {showEditForm && selectedOrg && (
        <EditOrganizationModal
          organization={selectedOrg}
          onClose={() => {
            setShowEditForm(false);
            setSelectedOrg(null);
          }}
          onSave={(formData) => handleUpdateOrg(formData)}
          loading={actionLoading}
        />
      )}

      {/* View Details Modal */}
      {showViewDetails && selectedOrg && (
        <ViewOrganizationModal
          organization={selectedOrg}
          onClose={() => {
            setShowViewDetails(false);
            setSelectedOrg(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedOrg && (
        <DeleteConfirmModal
          organizationName={selectedOrg.name}
          onConfirm={handleDeleteOrg}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSelectedOrg(null);
          }}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

interface CreateOrganizationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateOrganizationModal({ onClose, onSuccess }: CreateOrganizationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    contact_email: '',
    contact_phone: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Creating organization:', formData);

      const { data, error: dbError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          slug: formData.slug,
          domain: `${formData.slug}.member.ringing.org.uk`,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          is_active: true,
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(dbError.message);
      }

      console.log('Organization created successfully:', data);
      onSuccess();
    } catch (error) {
      console.error('Failed to create organization:', error);
      setError(error instanceof Error ? error.message : 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Create New Organization</CardTitle>
          <CardDescription>
            Set up a new organization in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organization Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter organization name"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Slug (URL identifier)</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="organization-slug"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be used as: {formData.slug}.member.ringing.org.uk
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Contact Email</label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="admin@organization.com"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Contact Phone (optional)</label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+44 123 456 7890"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Primary Color</label>
                <Input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Secondary Color</label>
                <Input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface EditOrganizationModalProps {
  organization: Organization;
  onClose: () => void;
  onSave: (formData: Partial<Organization>) => void;
  loading: boolean;
}

function EditOrganizationModal({ organization, onClose, onSave, loading }: EditOrganizationModalProps) {
  const [formData, setFormData] = useState({
    name: organization.name,
    slug: organization.slug,
    domain: organization.domain || '',
    contact_email: organization.contact_email,
    contact_phone: organization.contact_phone || '',
    primary_color: organization.primary_color,
    secondary_color: organization.secondary_color
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="modal-edit-organization">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit Organization</CardTitle>
          <CardDescription>Update organization details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Organization Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-org-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  required
                  data-testid="input-org-slug"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Domain</label>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="organization.com"
                data-testid="input-org-domain"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Contact Email</label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  required
                  data-testid="input-org-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Phone</label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  data-testid="input-org-phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Primary Color</label>
                <Input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  data-testid="input-org-primary-color"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Secondary Color</label>
                <Input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  data-testid="input-org-secondary-color"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} data-testid="button-save-edit">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface ViewOrganizationModalProps {
  organization: Organization;
  onClose: () => void;
}

function ViewOrganizationModal({ organization, onClose }: ViewOrganizationModalProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');

  useEffect(() => {
    fetchMembers();
  }, [organization.id]);

  const fetchMembers = async () => {
    try {
      console.log('Fetching members for organization:', organization.id, organization.name);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          memberships (
            id,
            status,
            membership_year,
            amount_paid,
            organization_membership_types (
              name,
              code
            )
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      console.log('Members fetch result:', { data, error, count: data?.length });

      if (error) {
        console.error('Supabase error fetching members:', error);
        throw error;
      }
      
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveMember = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from('memberships')
        .update({ status: 'active' })
        .eq('id', membershipId);

      if (error) throw error;
      
      await fetchMembers();
      toast.success('Member approved successfully');
    } catch (error) {
      console.error('Error approving member:', error);
      toast.error('Failed to approve member');
    }
  };

  const pendingMembers = members.filter(m => 
    m.memberships?.some((membership: any) => membership.status === 'pending')
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="modal-view-organization">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>{organization.name}</CardTitle>
          <CardDescription>Organization Management</CardDescription>
          <div className="flex gap-2 mt-4">
            <Button 
              variant={activeTab === 'details' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('details')}
              data-testid="button-tab-details"
            >
              Details
            </Button>
            <Button 
              variant={activeTab === 'members' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('members')}
              data-testid="button-tab-members"
            >
              Members ({members.length})
              {pendingMembers.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingMembers.length} pending</Badge>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Slug</label>
                  <p className="mt-1" data-testid="text-org-slug">{organization.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Domain</label>
                  <p className="mt-1" data-testid="text-org-domain">{organization.domain || 'Not set'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact Email</label>
                  <p className="mt-1" data-testid="text-org-email">{organization.contact_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact Phone</label>
                  <p className="mt-1" data-testid="text-org-phone">{organization.contact_phone || 'Not set'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1">
                    <Badge variant={organization.is_active ? 'default' : 'secondary'} data-testid="badge-org-status">
                      {organization.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No members yet</div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{member.first_name} {member.last_name}</p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                          {member.memberships && member.memberships.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {member.memberships.map((membership: any) => (
                                <div key={membership.id} className="flex items-center gap-2">
                                  <Badge variant={membership.status === 'active' ? 'default' : 'secondary'}>
                                    {membership.status}
                                  </Badge>
                                  <span className="text-sm">
                                    {membership.organization_membership_types?.name} - {membership.membership_year}
                                  </span>
                                  {membership.status === 'pending' && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => approveMember(membership.id)}
                                      data-testid={`button-approve-${member.id}`}
                                    >
                                      Approve
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <div className="p-6 border-t flex justify-end">
          <Button onClick={onClose} data-testid="button-close-view">Close</Button>
        </div>
      </Card>
    </div>
  );
}

interface DeleteConfirmModalProps {
  organizationName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function DeleteConfirmModal({ organizationName, onConfirm, onCancel, loading }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="modal-delete-confirm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-red-600">Deactivate Organization</CardTitle>
          <CardDescription>
            This action will deactivate the organization and prevent users from accessing it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Are you sure you want to deactivate <strong>{organizationName}</strong>?
          </p>
          <p className="text-sm text-gray-600">
            Members will no longer be able to access this organization. You can reactivate it later from the organization settings.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={loading} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={loading} data-testid="button-confirm-delete">
              {loading ? 'Deactivating...' : 'Deactivate Organization'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}