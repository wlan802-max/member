-- Fix RLS policies for profiles table to prevent infinite recursion
-- This script drops existing problematic policies and creates correct ones

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in organization" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- Create new non-recursive policies

-- 1. Users can view their own profile (simple check on user_id)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Admins can view all profiles in their organization
-- Using a function to avoid recursion
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "Admins can view profiles in organization" ON profiles
  FOR SELECT
  USING (
    -- User's own profile
    auth.uid() = user_id
    OR
    -- Profiles in same organization (for admins/members)
    (organization_id = get_user_org_id() AND organization_id IS NOT NULL)
  );

-- 4. Super admins can view all profiles
-- Check role directly from auth metadata or use a security definer function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    LIMIT 1
  );
$$;

CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT
  USING (is_super_admin());

-- 5. Allow inserts for authenticated users (for signup)
CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
