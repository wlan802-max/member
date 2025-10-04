-- Fix Memberships RLS - Supabase Compatible (no WITH CHECK)
-- Run in Supabase SQL Editor

-- Drop all existing membership policies
DROP POLICY IF EXISTS "Members can view own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can manage org memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can view org memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can insert org memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can update org memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can delete org memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can insert own memberships during signup" ON public.memberships;

-- SELECT: Members can view their own memberships
CREATE POLICY "Members can view own memberships"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- INSERT: Allow users to create memberships during signup
CREATE POLICY "Users can insert own memberships during signup"
  ON public.memberships
  FOR INSERT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Super admins and org admins can update memberships
CREATE POLICY "Admins can update memberships"
  ON public.memberships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
      AND is_active = true
    )
  );

-- DELETE: Only super admins and org admins can delete
CREATE POLICY "Admins can delete memberships"
  ON public.memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
      AND is_active = true
    )
  );

-- Service role full access
CREATE POLICY "service_role_memberships_access"
  ON public.memberships
  FOR ALL
  TO service_role
  USING (true);

-- Enable RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT ON public.memberships TO authenticated;
GRANT UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;

-- Verify policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'memberships'
ORDER BY policyname;
