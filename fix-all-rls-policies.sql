-- Comprehensive RLS Policy Fix
-- The query is failing because it joins profiles with organizations
-- Both tables need proper RLS policies

-- First, check what policies currently exist
SELECT 'Current policies on profiles:' as info;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

SELECT 'Current policies on organizations:' as info;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'organizations';

-- Drop and recreate profiles policies
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Profiles: Users can read their own profile
CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Organizations: Allow authenticated users to read organizations
-- (They need to see org details when viewing their profile)
DROP POLICY IF EXISTS "Authenticated users can read organizations" ON organizations;

CREATE POLICY "Authenticated users can read organizations"
ON organizations
FOR SELECT
TO authenticated
USING (
    -- Users can see their own organization
    id IN (
        SELECT organization_id
        FROM profiles
        WHERE user_id = auth.uid()
    )
);

-- Verify policies were created
SELECT 'Final policies on profiles:' as info;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

SELECT 'Final policies on organizations:' as info;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'organizations';

-- Test the exact query the app uses
SELECT 'Testing app query:' as info;
SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.role,
    p.user_id,
    o.id as org_id,
    o.name as org_name,
    o.slug as org_slug,
    o.primary_color,
    o.secondary_color
FROM profiles p
INNER JOIN organizations o ON p.organization_id = o.id
WHERE p.user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
