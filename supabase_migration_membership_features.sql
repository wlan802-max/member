-- Migration: Membership Year Configuration and Email Workflows
-- Description: Adds membership year settings, renewal form support, and email workflow automation
-- Created: 2025-10-02

-- ============================================================================
-- 1. ADD MEMBERSHIP YEAR AND RENEWAL SETTINGS TO ORGANIZATIONS
-- ============================================================================

-- Add columns to organizations table for membership year configuration
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS membership_year_start_month integer DEFAULT 1 CHECK (membership_year_start_month >= 1 AND membership_year_start_month <= 12),
ADD COLUMN IF NOT EXISTS membership_year_end_month integer DEFAULT 12 CHECK (membership_year_end_month >= 1 AND membership_year_end_month <= 12),
ADD COLUMN IF NOT EXISTS renewal_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS renewal_form_schema_id uuid REFERENCES public.organization_form_schemas(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.organizations.membership_year_start_month IS 'Start month of membership year (1-12, e.g., 4 for April)';
COMMENT ON COLUMN public.organizations.membership_year_end_month IS 'End month of membership year (1-12, e.g., 3 for March)';
COMMENT ON COLUMN public.organizations.renewal_enabled IS 'Whether members can renew their membership';
COMMENT ON COLUMN public.organizations.renewal_form_schema_id IS 'Form schema to use for renewal (NULL = use signup form)';

-- ============================================================================
-- 2. UPDATE FORM SCHEMAS TO SUPPORT FORM TYPE
-- ============================================================================

-- Add form type to distinguish signup vs renewal forms
ALTER TABLE public.organization_form_schemas 
ADD COLUMN IF NOT EXISTS form_type varchar(20) DEFAULT 'signup' CHECK (form_type IN ('signup', 'renewal', 'both'));

COMMENT ON COLUMN public.organization_form_schemas.form_type IS 'Type of form: signup, renewal, or both';

-- ============================================================================
-- 3. ADD MEMBERSHIP YEAR TRACKING TO MEMBERSHIPS
-- ============================================================================

-- Create memberships table if it doesn't exist (to track membership years)
CREATE TABLE IF NOT EXISTS public.memberships (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
membership_type_id uuid REFERENCES public.organization_membership_types(id),
membership_year integer NOT NULL,
status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
start_date date,
end_date date,
amount_paid decimal(10,2) DEFAULT 0.00,
payment_method varchar(50),
notes text,
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now(),
UNIQUE(profile_id, organization_id, membership_year)
);

CREATE INDEX IF NOT EXISTS idx_memberships_profile ON public.memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_year ON public.memberships(organization_id, membership_year);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);

-- Enable RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Members can view their own memberships
DROP POLICY IF EXISTS "Members can view own memberships" ON public.memberships;
CREATE POLICY "Members can view own memberships"
ON public.memberships
FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Admins can view and manage their org's memberships
DROP POLICY IF EXISTS "Admins can manage org memberships" ON public.memberships;
CREATE POLICY "Admins can manage org memberships"
ON public.memberships
FOR ALL
USING (
  -- Super admins can access everything
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  -- Org admins can access their own organization
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND is_active = true
  )
)
WITH CHECK (
  -- Super admins can create/update for any organization
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  -- Org admins can only create/update for their own organization
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND is_active = true
  )
);

-- ============================================================================
-- 4. EMAIL WORKFLOW CONFIGURATION TABLE
-- ============================================================================

-- Stores email workflow rules (e.g., "notify treasurer when adult membership signup")
CREATE TABLE IF NOT EXISTS public.email_workflows (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
name varchar(200) NOT NULL,
description text,
trigger_event varchar(50) NOT NULL CHECK (trigger_event IN ('signup', 'renewal', 'both')),

-- Conditions (JSONB): e.g., {"membership_type": "adult", "field_name": "value"}
conditions jsonb DEFAULT '{}',

-- Email settings
recipient_email varchar(255) NOT NULL,
recipient_name varchar(200),
email_subject varchar(300) NOT NULL,
email_template text NOT NULL,

-- Template variables available: {{first_name}}, {{last_name}}, {{membership_type}}, {{field_*}}

is_active boolean DEFAULT true,
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_workflows_org ON public.email_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_workflows_active ON public.email_workflows(organization_id, is_active);

-- Enable RLS
ALTER TABLE public.email_workflows ENABLE ROW LEVEL SECURITY;

-- Admins can manage their org's email workflows
DROP POLICY IF EXISTS "Admins can manage email workflows" ON public.email_workflows;
CREATE POLICY "Admins can manage email workflows"
ON public.email_workflows
FOR ALL
USING (
  -- Super admins can access everything
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  -- Org admins can access their own organization
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND is_active = true
  )
)
WITH CHECK (
  -- Super admins can create/update for any organization
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  -- Org admins can only create/update for their own organization
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND is_active = true
  )
);

-- ============================================================================
-- 5. HELPER FUNCTION: Calculate Current Membership Year
-- ============================================================================

-- Function to calculate current membership year based on org's year configuration
CREATE OR REPLACE FUNCTION public.get_current_membership_year(org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
start_month integer;
current_month integer;
current_year integer;
membership_year integer;
BEGIN
-- Get organization's membership year start month
SELECT membership_year_start_month INTO start_month
FROM public.organizations
WHERE id = org_id;

-- Default to January if not set
IF start_month IS NULL THEN
  start_month := 1;
END IF;

-- Get current month and year
current_month := EXTRACT(MONTH FROM CURRENT_DATE);
current_year := EXTRACT(YEAR FROM CURRENT_DATE);

-- If we're past the start month, this year's membership year starts this year
-- Otherwise, we're still in last year's membership year
IF current_month >= start_month THEN
  membership_year := current_year;
ELSE
  membership_year := current_year - 1;
END IF;

RETURN membership_year;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_current_membership_year(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_membership_year(uuid) TO anon;

-- ============================================================================
-- 6. UPDATE FRPS TO USE APRIL-MARCH MEMBERSHIP YEAR
-- ============================================================================

UPDATE public.organizations
SET 
membership_year_start_month = 4,  -- April
membership_year_end_month = 3,     -- March
renewal_enabled = true
WHERE slug = 'frps';

COMMENT ON TABLE public.memberships IS 'Tracks member membership years and payment status';
COMMENT ON TABLE public.email_workflows IS 'Automated email notifications triggered by signup/renewal events';
