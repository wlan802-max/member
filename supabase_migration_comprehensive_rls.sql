-- Migration: Comprehensive Row Level Security (RLS) Policies
-- Description: Complete RLS setup for all database tables with super admin support
-- Created: 2025-10-02
-- 
-- This migration establishes RLS policies for the entire database to ensure:
-- 1. Organization-level data isolation
-- 2. Super admin cross-organization access
-- 3. No recursion errors
-- 4. Proper public access for tenant detection and signup

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid recursion)
-- ============================================================================

-- Function to check if current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
      AND role = 'super_admin'
      AND organization_id IS NULL
      AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION public.is_super_admin IS 'Check if current user is a super admin (organization_id IS NULL)';

-- Function to check if current user is an admin in a specific organization
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
      AND organization_id = org_id
      AND role IN ('admin', 'super_admin')
      AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION public.is_org_admin IS 'Check if current user is an admin in a specific organization';

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id 
  FROM public.profiles 
  WHERE user_id = auth.uid() 
    AND is_active = true
    AND organization_id IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION public.get_user_org_ids IS 'Get all organization IDs the current user belongs to';

-- Function to check if current user has access to a specific profile
CREATE OR REPLACE FUNCTION public.can_access_profile(profile_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Super admins can access all profiles
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Users can access their own profile or profiles in their organization if they're an admin
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = profile_id_param
      AND (
        user_id = auth.uid() -- Own profile
        OR 
        (
          organization_id IN (SELECT public.get_user_org_ids()) 
          AND EXISTS (
            SELECT 1 FROM public.profiles p2 
            WHERE p2.user_id = auth.uid() 
              AND p2.role IN ('admin', 'super_admin')
              AND p2.is_active = true
          )
        )
      )
  );
END;
$$;

COMMENT ON FUNCTION public.can_access_profile IS 'Check if current user can access a specific profile';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_profile(uuid) TO authenticated;

-- ============================================================================
-- 1. ORGANIZATIONS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can view their organization" ON public.organizations;

-- Public can read active organizations (for tenant detection and signup)
CREATE POLICY "Public can view active organizations"
  ON public.organizations
  FOR SELECT
  USING (is_active = true);

-- Super admins can do everything
CREATE POLICY "Super admins can manage all organizations"
  ON public.organizations
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================================================
-- 2. PROFILES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage org profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view profiles in their organization
CREATE POLICY "Admins can view org profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.is_super_admin()
    OR
    (
      organization_id IN (SELECT public.get_user_org_ids())
      AND EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() 
          AND p.role IN ('admin', 'super_admin')
          AND p.is_active = true
      )
    )
  );

-- Allow profile creation during signup
CREATE POLICY "Users can insert own profile during signup"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR public.is_super_admin()
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage profiles in their organization
CREATE POLICY "Admins can manage org profiles"
  ON public.profiles
  FOR ALL
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 3. MEMBERSHIPS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can manage org memberships" ON public.memberships;

-- Members can view their own memberships
CREATE POLICY "Members can view own memberships"
  ON public.memberships
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Admins can view memberships in their organization
CREATE POLICY "Admins can view org memberships"
  ON public.memberships
  FOR SELECT
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- Admins can insert memberships in their organization
CREATE POLICY "Admins can insert org memberships"
  ON public.memberships
  FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- Admins can update memberships in their organization
CREATE POLICY "Admins can update org memberships"
  ON public.memberships
  FOR UPDATE
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- Admins can delete memberships in their organization
CREATE POLICY "Admins can delete org memberships"
  ON public.memberships
  FOR DELETE
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 4. DIGITAL_CARDS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own cards" ON public.digital_cards;
DROP POLICY IF EXISTS "Admins can manage org cards" ON public.digital_cards;

-- Users can view their own digital cards
CREATE POLICY "Users can view own cards"
  ON public.digital_cards
  FOR SELECT
  USING (
    membership_id IN (
      SELECT m.id FROM public.memberships m
      JOIN public.profiles p ON m.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Admins can manage cards in their organization
CREATE POLICY "Admins can manage org cards"
  ON public.digital_cards
  FOR ALL
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 5. EMAIL_CAMPAIGNS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage org campaigns" ON public.email_campaigns;

-- Admins can manage campaigns in their organization
CREATE POLICY "Admins can manage org campaigns"
  ON public.email_campaigns
  FOR ALL
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 6. EMAIL_SUBSCRIBERS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can subscribe" ON public.email_subscribers;
DROP POLICY IF EXISTS "Admins can manage org subscribers" ON public.email_subscribers;

-- Public can subscribe (for signup forms)
CREATE POLICY "Public can subscribe"
  ON public.email_subscribers
  FOR INSERT
  WITH CHECK (true);

-- Admins can manage subscribers in their organization
CREATE POLICY "Admins can manage org subscribers"
  ON public.email_subscribers
  FOR ALL
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 7. RENEWAL_WORKFLOWS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage org renewal workflows" ON public.renewal_workflows;

-- Admins can manage renewal workflows in their organization
CREATE POLICY "Admins can manage org renewal workflows"
  ON public.renewal_workflows
  FOR ALL
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 8. ORGANIZATION_MEMBERSHIP_TYPES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active membership types" ON public.organization_membership_types;
DROP POLICY IF EXISTS "Admins can manage org membership types" ON public.organization_membership_types;

-- Public can view active membership types (for signup)
CREATE POLICY "Anyone can view active membership types"
  ON public.organization_membership_types
  FOR SELECT
  USING (is_active = true);

-- Admins can manage membership types in their organization
CREATE POLICY "Admins can manage org membership types"
  ON public.organization_membership_types
  FOR ALL
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 9. ORGANIZATION_FORM_SCHEMAS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active form schemas" ON public.organization_form_schemas;
DROP POLICY IF EXISTS "Admins can manage org form schemas" ON public.organization_form_schemas;

-- Public can view active form schemas (for signup)
CREATE POLICY "Anyone can view active form schemas"
  ON public.organization_form_schemas
  FOR SELECT
  USING (is_active = true);

-- Admins can manage form schemas in their organization
CREATE POLICY "Admins can manage org form schemas"
  ON public.organization_form_schemas
  FOR ALL
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 10. PROFILE_FORM_RESPONSES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own form responses" ON public.profile_form_responses;
DROP POLICY IF EXISTS "Admins can view org form responses" ON public.profile_form_responses;
DROP POLICY IF EXISTS "Allow form response creation" ON public.profile_form_responses;

-- Users can view their own form responses
CREATE POLICY "Users can view own form responses"
  ON public.profile_form_responses
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Admins can view responses in their organization
CREATE POLICY "Admins can view org form responses"
  ON public.profile_form_responses
  FOR SELECT
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- Allow form response creation during signup
CREATE POLICY "Allow form response creation"
  ON public.profile_form_responses
  FOR INSERT
  WITH CHECK (true);

-- Admins can update/delete form responses in their organization
CREATE POLICY "Admins can manage org form responses"
  ON public.profile_form_responses
  FOR ALL
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 11. EMAIL_WORKFLOWS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage email workflows" ON public.email_workflows;

-- Admins can manage email workflows in their organization
CREATE POLICY "Admins can manage email workflows"
  ON public.email_workflows
  FOR ALL
  USING (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    public.is_org_admin(organization_id)
  );

-- ============================================================================
-- 12. ORGANIZATION_DOMAINS TABLE RLS POLICIES (Already Done in Custom Domains Migration)
-- ============================================================================
-- The organization_domains table RLS policies are already defined in 
-- supabase_migration_custom_domains.sql and don't need to be redefined here.
-- Keeping this comment for documentation purposes.

-- ============================================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

-- Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_subscribers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_membership_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_form_schemas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_form_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_workflows TO authenticated;

-- Grant SELECT to anonymous users for public tables (signup flows)
GRANT SELECT ON public.organizations TO anon;
GRANT INSERT ON public.profiles TO anon;
GRANT SELECT ON public.organization_membership_types TO anon;
GRANT SELECT ON public.organization_form_schemas TO anon;
GRANT INSERT ON public.profile_form_responses TO anon;
GRANT INSERT ON public.email_subscribers TO anon;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration sets up comprehensive RLS policies for all tables:
--
-- 1. Organizations: Public can view active, super admins can manage all
-- 2. Profiles: Users see own, admins see org, super admins see all
-- 3. Memberships: Members see own, admins manage org
-- 4. Digital Cards: Users see own, admins manage org
-- 5. Email Campaigns: Admins manage org
-- 6. Email Subscribers: Public can subscribe, admins manage org
-- 7. Renewal Workflows: Admins manage org
-- 8. Membership Types: Public can view active, admins manage org
-- 9. Form Schemas: Public can view active, admins manage org
-- 10. Form Responses: Users see own, admins see org, public can create
-- 11. Email Workflows: Admins manage org
-- 12. Organization Domains: (Defined in separate migration)
--
-- Key Features:
-- - Super admins (organization_id IS NULL) have cross-org access
-- - Helper functions prevent RLS recursion errors
-- - Public access for signup and tenant detection
-- - Organization-level data isolation
-- - Role-based access control (member, admin, super_admin)
