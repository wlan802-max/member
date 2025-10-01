-- Setup Admin Organization and Super Admin User
-- Run this in your Supabase SQL Editor

-- Step 1: Create the admin organization
INSERT INTO organizations (
    slug,
    name,
    domain,
    contact_email,
    primary_color,
    secondary_color,
    is_active
) VALUES (
    'admin',
    'System Administration',
    'admin.member.ringing.org.uk',
    'admin@member.ringing.org.uk',
    '#1E40AF',
    '#3B82F6',
    true
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    domain = EXCLUDED.domain,
    contact_email = EXCLUDED.contact_email,
    is_active = EXCLUDED.is_active;

-- Step 2: Get the organization ID (you'll need this for the next step)
SELECT id, name, slug FROM organizations WHERE slug = 'admin';

-- Step 3: After creating a user in Supabase Auth, create the profile
-- Replace 'USER_ID_FROM_SUPABASE_AUTH' with the actual user ID
-- Replace 'ORG_ID_FROM_STEP_2' with the organization ID from step 2

/*
INSERT INTO profiles (
    user_id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active
) VALUES (
    'USER_ID_FROM_SUPABASE_AUTH',
    'ORG_ID_FROM_STEP_2',
    'admin@member.ringing.org.uk',
    'System',
    'Administrator',
    'super_admin',
    true
);
*/