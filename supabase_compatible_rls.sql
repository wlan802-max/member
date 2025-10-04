-- Supabase-compatible RLS reset (no WITH CHECK, no subqueries)
-- Run each section separately if needed

-- SECTION 1: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users in the same organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "allow_own_profile_read" ON public.profiles;
DROP POLICY IF EXISTS "allow_own_profile_update" ON public.profiles;
DROP POLICY IF EXISTS "allow_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "service_role_all_access" ON public.profiles;
DROP POLICY IF EXISTS "TEMP: All authenticated can read all profiles" ON public.profiles;

-- SECTION 2: Drop helper function
DROP FUNCTION IF EXISTS public.get_user_org_id();

-- SECTION 3: Create SELECT policy (read own profile)
CREATE POLICY "allow_own_profile_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SECTION 4: Create UPDATE policy (update own profile) 
CREATE POLICY "allow_own_profile_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- SECTION 5: Create INSERT policy (create own profile)
CREATE POLICY "allow_profile_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  USING (user_id = auth.uid());

-- SECTION 6: Service role full access
CREATE POLICY "service_role_full_access"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true);

-- SECTION 7: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SECTION 8: Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- SECTION 9: Verify
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
