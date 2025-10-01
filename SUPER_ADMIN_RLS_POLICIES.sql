-- ============================================================================
-- SUPER ADMIN RLS POLICIES - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- This fixes the issue where super admins cannot see or create organizations
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can read all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;

-- Organizations: Super admins can read ALL organizations
CREATE POLICY "Super admins can read all organizations"
ON organizations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Organizations: Super admins can create organizations
CREATE POLICY "Super admins can create organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Organizations: Super admins can update any organization
CREATE POLICY "Super admins can update organizations"
ON organizations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Organizations: Super admins can delete organizations
CREATE POLICY "Super admins can delete organizations"
ON organizations
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Profiles: Super admins can read all profiles (for counting members)
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

-- Verify policies were created
SELECT 'Policies on organizations:' as info;
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;

SELECT 'Policies on profiles:' as info;
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
