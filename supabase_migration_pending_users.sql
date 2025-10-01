-- ============================================================================
-- MIGRATION: Add Pending User Approval System
-- ============================================================================
-- Run this script in your Supabase SQL Editor
-- This adds status tracking and auto-profile creation for pending users
-- ============================================================================

-- Step 1: Create status enum type
DO $$ BEGIN
  CREATE TYPE profile_status AS ENUM ('pending', 'active', 'suspended', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status profile_status DEFAULT 'active';

-- Step 3: Add optional fields for pending/rejection tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pending_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_note TEXT,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status_updated_by UUID;

-- Step 4: Backfill existing profiles to 'active' status
UPDATE public.profiles 
SET status = 'active', 
    status_updated_at = NOW()
WHERE status IS NULL OR status != 'active';

-- Step 5: Create function to auto-create pending profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  org_id UUID;
  org_slug TEXT;
BEGIN
  -- Extract organization slug from user metadata
  org_slug := NEW.raw_user_meta_data->>'organization_slug';
  
  -- If no org slug provided, skip profile creation (super admin manual creation)
  IF org_slug IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Look up organization ID from slug
  SELECT id INTO org_id
  FROM public.organizations
  WHERE slug = org_slug AND is_active = true
  LIMIT 1;
  
  -- If organization not found, log but don't fail signup
  IF org_id IS NULL THEN
    RAISE WARNING 'Organization not found for slug: %', org_slug;
    RETURN NEW;
  END IF;
  
  -- Create pending profile (idempotent - skip if exists)
  INSERT INTO public.profiles (
    user_id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    status,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'member',
    'pending',
    false,  -- Not active until approved
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 6: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Update RLS policies for pending users

-- Allow users to see their own pending profile
DROP POLICY IF EXISTS "Users can view own pending profile" ON public.profiles;
CREATE POLICY "Users can view own pending profile"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Allow organization admins to view pending users in their organization
DROP POLICY IF EXISTS "Admins can view org pending users" ON public.profiles;
CREATE POLICY "Admins can view org pending users"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id = profiles.organization_id
        AND p.role IN ('admin', 'super_admin')
        AND p.status = 'active'
        AND p.is_active = true
    )
  );

-- Allow organization admins to update pending users (approve/reject)
DROP POLICY IF EXISTS "Admins can update org pending users" ON public.profiles;
CREATE POLICY "Admins can update org pending users"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id = profiles.organization_id
        AND p.role IN ('admin', 'super_admin')
        AND p.status = 'active'
        AND p.is_active = true
    )
  )
  WITH CHECK (
    -- Prevent role escalation and cross-org changes
    role IN ('member', 'admin')
    AND status IN ('active', 'rejected', 'suspended')
    AND organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Allow super admins to do everything
DROP POLICY IF EXISTS "Super admins have full access" ON public.profiles;
CREATE POLICY "Super admins have full access"
  ON public.profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'super_admin'
        AND p.organization_id IS NULL
    )
  );

-- Step 8: Create helper view for pending users (optional, for easier querying)
CREATE OR REPLACE VIEW public.org_pending_profiles AS
SELECT 
  p.*,
  o.name as organization_name,
  o.slug as organization_slug
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id
WHERE p.status = 'pending';

-- Grant access to authenticated users
GRANT SELECT ON public.org_pending_profiles TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Verify the trigger is working by signing up a test user
-- 3. Check that pending profiles appear in org_pending_profiles view
-- ============================================================================
