-- Fix memberships RLS policies
-- The policies were checking for profiles.status = 'active', 
-- but profiles table uses is_active (boolean) instead

-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Admins can manage org memberships" ON public.memberships;

-- Recreate with correct field name
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
