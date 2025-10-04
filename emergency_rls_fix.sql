-- EMERGENCY FIX: Remove circular dependency in RLS policies
-- This allows users to log in immediately

-- Drop the problematic policy that causes circular dependency
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;

-- Recreate it using a helper function to avoid recursion
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Now create the policy using the helper function
CREATE POLICY "Users can view org profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Users can see profiles in their organization
    organization_id = get_user_org_id()
    OR
    -- OR their own profile (fallback)
    user_id = auth.uid()
  );

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_org_id() TO authenticated, anon;

-- Verify policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
