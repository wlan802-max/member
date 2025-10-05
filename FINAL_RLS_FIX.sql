-- FINAL FIX: Break RLS recursion by using postgres-owned function
-- This gives the function BYPASSRLS privilege

-- Step 1: Drop existing problematic policies and function
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;
DROP FUNCTION IF EXISTS public.get_user_org_id();

-- Step 2: Create the helper function owned by postgres (has BYPASSRLS)
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Step 3: Change owner to postgres so it bypasses RLS
ALTER FUNCTION public.get_user_org_id() OWNER TO postgres;

-- Step 4: Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION public.get_user_org_id() TO anon, authenticated, service_role;

-- Step 5: Recreate the org visibility policy using the bypass-enabled function
CREATE POLICY "Users can view org profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Users can see profiles in their organization
    organization_id = get_user_org_id()
    OR
    -- OR their own profile (direct check, no recursion)
    user_id = auth.uid()
  );

-- Step 6: Verify the function owner
SELECT 
  routine_name,
  routine_schema,
  security_type,
  r.rolname as owner
FROM information_schema.routines
LEFT JOIN pg_proc p ON p.proname = routine_name
LEFT JOIN pg_roles r ON p.proowner = r.oid
WHERE routine_name = 'get_user_org_id';

-- Step 7: Verify all policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
