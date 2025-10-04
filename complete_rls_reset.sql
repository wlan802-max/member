-- COMPLETE RLS RESET for profiles table
-- This will clean everything and create minimal working policies

-- Step 1: Drop ALL policies on profiles (clean slate)
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Drop any helper functions
DROP FUNCTION IF EXISTS public.get_user_org_id() CASCADE;

-- Step 3: Verify all policies are gone
SELECT COUNT(*) as remaining_policies 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 4: Create MINIMAL working policies
-- These are simple and won't cause recursion

-- Policy 1: Users can read their OWN profile (no recursion, direct check)
CREATE POLICY "allow_own_profile_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can update their OWN profile
CREATE POLICY "allow_own_profile_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Allow profile creation during signup
CREATE POLICY "allow_profile_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Service role can do anything (for backend operations)
CREATE POLICY "service_role_all_access"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 5: Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant basic permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Step 7: Verify new policies
SELECT 
  tablename, 
  policyname, 
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
