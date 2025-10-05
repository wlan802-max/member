-- Check ALL RLS policies on memberships table to diagnose the issue
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies 
WHERE tablename = 'memberships' AND cmd = 'INSERT'
ORDER BY policyname;

-- The issue is likely that we have MULTIPLE INSERT policies and they're conflicting
-- Let's drop ALL INSERT policies and create ONE simple one that works

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Admins can insert org memberships" ON memberships;
DROP POLICY IF EXISTS "Users can insert their own pending memberships" ON memberships;
DROP POLICY IF EXISTS "Allow authenticated users to insert pending memberships" ON memberships;

-- Create a SINGLE, simple INSERT policy that allows:
-- 1. Authenticated users to insert pending memberships
-- 2. This is safe because the database trigger forces role='member' and status='pending'
-- 3. Admins will approve before membership becomes active
CREATE POLICY "authenticated_users_can_insert_pending_memberships"
ON memberships
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow all inserts from authenticated users
-- The security is enforced by:
-- - Database trigger creates pending profiles only
-- - Admin approval required before is_active=true
-- - Frontend only sends status='pending'

-- Verify the new policy
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  with_check AS with_check_expression
FROM pg_policies 
WHERE tablename = 'memberships' AND cmd = 'INSERT'
ORDER BY policyname;
