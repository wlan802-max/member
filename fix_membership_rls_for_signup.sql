-- Fix RLS policies for memberships table to allow signup flow
-- This allows newly signed-up users to create their own pending membership records

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'memberships';

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own pending memberships" ON memberships;

-- Create new policy that allows users to insert memberships for their own profile
-- This is safe because:
-- 1. They can only insert with status='pending' (not 'active')
-- 2. They can only insert for their own profile_id
-- 3. Admin still needs to approve before membership becomes active
CREATE POLICY "Users can insert their own pending memberships"
ON memberships
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be inserting for their own profile
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  -- Force status to be pending (additional safety)
  AND status = 'pending'
);

-- Also need to allow the profile lookup during signup
-- Check if profiles has the right SELECT policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'SELECT';

-- Add policy to allow users to read their own profile (needed for waitForProfile function)
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;

CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('memberships', 'profiles')
ORDER BY tablename, cmd, policyname;
