-- Create Super Admin Profile for User: 06a91bf8-7754-4f20-80bf-ec4a44999b66
-- Run this in Supabase SQL Editor

-- Step 1: Check if the admin organization exists
SELECT 'Checking admin organization...' as step;
SELECT id, slug, name, is_active FROM organizations WHERE slug = 'admin';

-- Step 2: Check if user exists in auth.users
SELECT 'Checking if user exists in auth...' as step;
SELECT id, email, created_at FROM auth.users WHERE id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';

-- Step 3: Check if profile already exists
SELECT 'Checking if profile already exists...' as step;
SELECT id, user_id, organization_id, email, role FROM profiles WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';

-- Step 4: Create or update the super admin profile
DO $$
DECLARE
    admin_org_id uuid;
    profile_count int;
BEGIN
    -- Get the admin organization ID
    SELECT id INTO admin_org_id FROM organizations WHERE slug = 'admin';

    IF admin_org_id IS NULL THEN
        RAISE EXCEPTION 'Admin organization not found! Run setup-organizations.sql first.';
    END IF;

    -- Check if profile exists
    SELECT COUNT(*) INTO profile_count FROM profiles WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';

    IF profile_count > 0 THEN
        -- Update existing profile
        UPDATE profiles
        SET
            role = 'super_admin',
            is_active = true,
            organization_id = admin_org_id,
            updated_at = now()
        WHERE user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';

        RAISE NOTICE 'Updated existing profile to super_admin';
    ELSE
        -- Create new profile
        INSERT INTO profiles (
            user_id,
            organization_id,
            email,
            first_name,
            last_name,
            role,
            is_active
        ) VALUES (
            '06a91bf8-7754-4f20-80bf-ec4a44999b66',
            admin_org_id,
            'will@w-j-lander.uk',
            'Will',
            'Lander',
            'super_admin',
            true
        );

        RAISE NOTICE 'Created new super_admin profile';
    END IF;
END $$;

-- Step 5: Verify the profile was created
SELECT 'Verification - Profile should exist now:' as step;
SELECT
    p.id,
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.is_active,
    o.slug as org_slug,
    o.name as org_name
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE p.user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';

-- Step 6: Test the query that the app uses
SELECT 'Testing app query (should return profile with organization):' as step;
SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.role,
    o.id as org_id,
    o.name as org_name,
    o.slug as org_slug,
    o.primary_color,
    o.secondary_color
FROM profiles p
INNER JOIN organizations o ON p.organization_id = o.id
WHERE p.user_id = '06a91bf8-7754-4f20-80bf-ec4a44999b66';
