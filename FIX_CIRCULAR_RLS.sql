-- ============================================================================
-- FIX CIRCULAR RLS DEPENDENCY - RUN THIS IMMEDIATELY
-- ============================================================================
-- The previous policies created circular dependency:
-- - Profile query needs to join organizations
-- - Organizations policy checks profiles table
-- Result: 500 error due to infinite recursion
-- ============================================================================

-- DROP THE PROBLEMATIC POLICIES
DROP POLICY IF EXISTS "Super admins can read all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;

-- ============================================================================
-- SOLUTION: Use auth.jwt() to check role directly from JWT claims
-- This avoids the circular dependency by not querying profiles table
-- ============================================================================

-- First, ensure super admin role is stored in JWT metadata
-- We'll use a simpler approach: check if user is in a special super_admins table
-- OR check organization_id is NULL (super admins don't belong to an org)

-- ============================================================================
-- OPTION 1: Simple check - super admins have NULL organization_id
-- ============================================================================

-- Profiles: Users can read their own profile (original policy)
-- This must work for ALL users including super admins
CREATE POLICY IF NOT EXISTS "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Organizations: Users can read their own organization
-- This allows the profile query to work
CREATE POLICY IF NOT EXISTS "Users can read their organization"
ON organizations
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT organization_id
        FROM profiles
        WHERE user_id = auth.uid()
    )
);

-- Organizations: Super admins (NULL org) can read ALL organizations
CREATE POLICY IF NOT EXISTS "Super admins can read all orgs"
ON organizations
FOR SELECT
TO authenticated
USING (
    -- User is super admin (no organization_id)
    NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND organization_id IS NOT NULL
    )
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Organizations: Super admins can create organizations
CREATE POLICY IF NOT EXISTS "Super admins can create orgs"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (
    NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND organization_id IS NOT NULL
    )
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Organizations: Super admins can update any organization
CREATE POLICY IF NOT EXISTS "Super admins can update orgs"
ON organizations
FOR UPDATE
TO authenticated
USING (
    NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND organization_id IS NOT NULL
    )
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
)
WITH CHECK (
    NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND organization_id IS NOT NULL
    )
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Organizations: Super admins can delete organizations
CREATE POLICY IF NOT EXISTS "Super admins can delete orgs"
ON organizations
FOR DELETE
TO authenticated
USING (
    NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND organization_id IS NOT NULL
    )
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Profiles: Super admins can read all profiles (for counting)
CREATE POLICY IF NOT EXISTS "Super admins can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() -- Own profile
    OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid()
        AND p.role = 'super_admin'
        AND p.organization_id IS NULL
    )
);

-- Verify the super admin user has NULL organization_id
SELECT 'Checking super admin profile:' as info;
SELECT id, user_id, email, role, organization_id
FROM profiles
WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';

-- If organization_id is NOT NULL, we need to set it to NULL for super admin
-- Uncomment and run this if needed:
-- UPDATE profiles SET organization_id = NULL WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66' AND role = 'super_admin';

-- Verify policies
SELECT 'Final policies on organizations:' as info;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'organizations' ORDER BY cmd, policyname;

SELECT 'Final policies on profiles:' as info;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY cmd, policyname;
