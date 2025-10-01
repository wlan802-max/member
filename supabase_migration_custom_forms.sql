-- Migration: Custom Organization Forms System
-- Description: Enables organizations to create custom signup/membership forms
-- Created: 2025-10-01

-- ============================================================================
-- 1. ORGANIZATION MEMBERSHIP TYPES TABLE
-- ============================================================================
-- Stores membership tiers/types for each organization (e.g., Adult, Junior, Family)

CREATE TABLE IF NOT EXISTS public.organization_membership_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  description text,
  price decimal(10,2) NOT NULL DEFAULT 0.00,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Index for fast lookups
CREATE INDEX idx_membership_types_org ON public.organization_membership_types(organization_id);
CREATE INDEX idx_membership_types_active ON public.organization_membership_types(organization_id, is_active);

-- ============================================================================
-- 2. ORGANIZATION FORM SCHEMAS TABLE
-- ============================================================================
-- Stores versioned form definitions as JSONB

CREATE TABLE IF NOT EXISTS public.organization_form_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  title varchar(200) DEFAULT 'Membership Application',
  description text,
  schema_data jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, schema_version)
);

-- Index for active schema lookups
CREATE INDEX idx_form_schemas_org ON public.organization_form_schemas(organization_id);
CREATE INDEX idx_form_schemas_active ON public.organization_form_schemas(organization_id, is_active);

-- ============================================================================
-- 3. PROFILE FORM RESPONSES TABLE
-- ============================================================================
-- Stores submitted form data from signup

CREATE TABLE IF NOT EXISTS public.profile_form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  schema_id uuid REFERENCES public.organization_form_schemas(id),
  schema_version integer,
  response_data jsonb NOT NULL DEFAULT '{}',
  selected_membership_types uuid[] DEFAULT '{}',
  total_amount decimal(10,2) DEFAULT 0.00,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

-- Index for queries
CREATE INDEX idx_form_responses_profile ON public.profile_form_responses(profile_id);
CREATE INDEX idx_form_responses_org ON public.profile_form_responses(organization_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.organization_membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_form_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_form_responses ENABLE ROW LEVEL SECURITY;

-- Membership Types Policies
-- Public can read active membership types for signup
DROP POLICY IF EXISTS "Anyone can view active membership types" ON public.organization_membership_types;
CREATE POLICY "Anyone can view active membership types"
  ON public.organization_membership_types
  FOR SELECT
  USING (is_active = true);

-- Admins can manage their org's membership types
DROP POLICY IF EXISTS "Admins can manage org membership types" ON public.organization_membership_types;
CREATE POLICY "Admins can manage org membership types"
  ON public.organization_membership_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id = organization_membership_types.organization_id
        AND p.role IN ('admin', 'super_admin')
        AND p.status = 'active'
    )
  );

-- Form Schemas Policies
-- Public can read active form schemas for signup
DROP POLICY IF EXISTS "Anyone can view active form schemas" ON public.organization_form_schemas;
CREATE POLICY "Anyone can view active form schemas"
  ON public.organization_form_schemas
  FOR SELECT
  USING (is_active = true);

-- Admins can manage their org's form schemas
DROP POLICY IF EXISTS "Admins can manage org form schemas" ON public.organization_form_schemas;
CREATE POLICY "Admins can manage org form schemas"
  ON public.organization_form_schemas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id = organization_form_schemas.organization_id
        AND p.role IN ('admin', 'super_admin')
        AND p.status = 'active'
    )
  );

-- Form Responses Policies
-- Users can view their own responses
DROP POLICY IF EXISTS "Users can view own form responses" ON public.profile_form_responses;
CREATE POLICY "Users can view own form responses"
  ON public.profile_form_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_form_responses.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- Admins can view responses in their organization
DROP POLICY IF EXISTS "Admins can view org form responses" ON public.profile_form_responses;
CREATE POLICY "Admins can view org form responses"
  ON public.profile_form_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id = profile_form_responses.organization_id
        AND p.role IN ('admin', 'super_admin')
        AND p.status = 'active'
    )
  );

-- Allow form response creation during signup (insert only)
DROP POLICY IF EXISTS "Allow form response creation" ON public.profile_form_responses;
CREATE POLICY "Allow form response creation"
  ON public.profile_form_responses
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 5. TRIGGER: Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_membership_types_updated_at ON public.organization_membership_types;
CREATE TRIGGER update_membership_types_updated_at
  BEFORE UPDATE ON public.organization_membership_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_schemas_updated_at ON public.organization_form_schemas;
CREATE TRIGGER update_form_schemas_updated_at
  BEFORE UPDATE ON public.organization_form_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. DEFAULT FORM SCHEMA TEMPLATE
-- ============================================================================
-- Creates a basic form schema for existing organizations without custom forms

DO $$
DECLARE
  org_record RECORD;
  new_schema_id uuid;
BEGIN
  FOR org_record IN SELECT id, name FROM public.organizations WHERE is_active = true
  LOOP
    -- Create default membership types if none exist
    IF NOT EXISTS (SELECT 1 FROM public.organization_membership_types WHERE organization_id = org_record.id) THEN
      INSERT INTO public.organization_membership_types (organization_id, code, name, description, price, is_default, display_order)
      VALUES
        (org_record.id, 'adult', 'Adult Member', 'Standard adult membership', 25.00, true, 1),
        (org_record.id, 'junior', 'Junior Member', 'For members under 18', 13.00, false, 2);
    END IF;

    -- Create default form schema if none exists
    IF NOT EXISTS (SELECT 1 FROM public.organization_form_schemas WHERE organization_id = org_record.id) THEN
      INSERT INTO public.organization_form_schemas (
        organization_id,
        schema_version,
        title,
        description,
        schema_data,
        is_active
      )
      VALUES (
        org_record.id,
        1,
        'Membership Application',
        'Standard membership signup form',
        '{
          "sections": [
            {
              "id": "personal_details",
              "title": "Personal Details",
              "description": "Please provide your contact information",
              "fields": [
                {
                  "id": "full_name",
                  "type": "text",
                  "label": "Full Name",
                  "required": true,
                  "placeholder": "Enter your full name"
                },
                {
                  "id": "email",
                  "type": "email",
                  "label": "Email Address",
                  "required": true,
                  "placeholder": "your.email@example.com"
                },
                {
                  "id": "phone",
                  "type": "tel",
                  "label": "Phone Number",
                  "required": false,
                  "placeholder": "+44 1234 567890"
                }
              ]
            },
            {
              "id": "membership",
              "title": "Membership Type",
              "description": "Select your membership type",
              "fields": [
                {
                  "id": "membership_selection",
                  "type": "membership_selection",
                  "label": "Choose Membership Type",
                  "required": true,
                  "allow_multiple": false
                }
              ]
            },
            {
              "id": "consent",
              "title": "Terms & Conditions",
              "fields": [
                {
                  "id": "agree_rules",
                  "type": "checkbox",
                  "label": "I agree to be bound by the rules of the organization",
                  "required": true
                },
                {
                  "id": "agree_data",
                  "type": "checkbox",
                  "label": "I agree to the data processing terms",
                  "required": true
                }
              ]
            }
          ]
        }'::jsonb,
        true
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get active form schema for an organization
CREATE OR REPLACE FUNCTION get_active_form_schema(org_id uuid)
RETURNS TABLE (
  id uuid,
  schema_version integer,
  title varchar,
  description text,
  schema_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.schema_version,
    s.title,
    s.description,
    s.schema_data
  FROM public.organization_form_schemas s
  WHERE s.organization_id = org_id
    AND s.is_active = true
  ORDER BY s.schema_version DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate total membership cost
CREATE OR REPLACE FUNCTION calculate_membership_total(membership_type_ids uuid[])
RETURNS decimal AS $$
DECLARE
  total decimal(10,2);
BEGIN
  SELECT COALESCE(SUM(price), 0.00)
  INTO total
  FROM public.organization_membership_types
  WHERE id = ANY(membership_type_ids)
    AND is_active = true;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.organization_membership_types IS 'Membership tiers and pricing per organization';
COMMENT ON TABLE public.organization_form_schemas IS 'Versioned form definitions for organization signup forms';
COMMENT ON TABLE public.profile_form_responses IS 'Submitted form data from member signups';
