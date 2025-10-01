-- Fix RLS Policies for Super Admin Access
-- Run this in Supabase SQL Editor

-- Check current policies on profiles table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- The issue: RLS might be blocking the query
-- Solution: Add a policy that allows users to read their own profile

-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;

-- Create a simple policy that allows users to read their own profile
CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Also ensure super admins can read all profiles
DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;

CREATE POLICY "Super admins can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid()
        AND p.role = 'super_admin'
    )
);

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- Test the query as the current user
SELECT 'Testing query for user: 06a91bf8-7754-4f20-80bf-ec4a44999b66' as test;

-- This should return the profile
SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.role,
    o.id as org_id,
    o.name as org_name,
    o.slug as org_slug
FROM profiles p
INNER JOIN organizations o ON p.organization_id = o.id
WHERE p.user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
