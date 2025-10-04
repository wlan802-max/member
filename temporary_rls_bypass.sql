-- TEMPORARY BYPASS: Allow all authenticated users to read all profiles
-- This is INSECURE but will let you login to fix things properly
-- ONLY use this temporarily!

-- Drop the problematic org visibility policy
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;

-- Create a temporary wide-open policy
CREATE POLICY "TEMP: All authenticated can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow all reads for now

-- Verify policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- IMPORTANT: After logging in, we need to replace this with proper policies
-- This is temporary to unblock you!
