import { supabase } from '@/lib/supabase/client';

export interface CreateOrganizationData {
  name: string;
  slug: string;
  contact_email: string;
  contact_phone?: string;
  primary_color?: string;
  secondary_color?: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
  contact_phone: string | null;
  address: any | null;
  settings: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const organizationsApi = {
  async createOrganization(data: CreateOrganizationData): Promise<Organization> {
    // First, create the organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.name,
        slug: data.slug,
        domain: `${data.slug}.member.ringing.org.uk`,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        primary_color: data.primary_color || '#3B82F6',
        secondary_color: data.secondary_color || '#1E40AF',
        is_active: true,
      })
      .select()
      .single();

    if (orgError) {
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }

    // Create admin user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.admin_email,
      password: 'temp-password-' + Math.random().toString(36).slice(-8), // Generate temporary password
      options: {
        data: {
          first_name: data.admin_first_name,
          last_name: data.admin_last_name,
          organization_id: organization.id,
          role: 'admin'
        }
      }
    });

    if (authError) {
      // If user creation fails, we should clean up the organization
      await supabase.from('organizations').delete().eq('id', organization.id);
      throw new Error(`Failed to create admin user: ${authError.message}`);
    }

    // Create admin profile
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          organization_id: organization.id,
          email: data.admin_email,
          first_name: data.admin_first_name,
          last_name: data.admin_last_name,
          role: 'admin',
          is_active: true,
        });

      if (profileError) {
        console.error('Failed to create admin profile:', profileError);
        // Continue anyway, as the organization is created
      }
    }

    return organization;
  },

  async getAllOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }

    return data || [];
  },

  async getOrganization(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch organization: ${error.message}`);
    }

    return data;
  },

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update organization: ${error.message}`);
    }

    return data;
  },

  async deleteOrganization(id: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete organization: ${error.message}`);
    }
  },

  async getOrganizationStats(id: string): Promise<{
    memberCount: number;
    activeMemberships: number;
    totalRevenue: number;
  }> {
    // Get member count
    const { count: memberCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id)
      .eq('is_active', true);

    // Get active memberships count
    const { count: activeMemberships } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id)
      .eq('status', 'active');

    // Get total revenue (sum of all payments)
    const { data: revenueData } = await supabase
      .from('memberships')
      .select('amount_paid')
      .eq('organization_id', id)
      .not('amount_paid', 'is', null);

    const totalRevenue = revenueData?.reduce((sum, membership) => 
      sum + (membership.amount_paid || 0), 0) || 0;

    return {
      memberCount: memberCount || 0,
      activeMemberships: activeMemberships || 0,
      totalRevenue,
    };
  }
};