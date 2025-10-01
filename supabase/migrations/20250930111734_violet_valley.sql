-- Super Admin Setup Script
-- Run this in your Supabase SQL Editor

-- 1. Create the super admin organization
INSERT INTO organizations (
    id,
    slug,
    name,
    domain,
    contact_email,
    primary_color,
    secondary_color,
    is_active
) VALUES (
    gen_random_uuid(),
    'admin',
    'System Administration',
    'admin.member.ringing.org.uk',
    'admin@member.ringing.org.uk',
    '#1E40AF',
    '#3B82F6',
    true
) ON CONFLICT (slug) DO NOTHING;

-- 2. Get the organization ID for reference
-- (You'll need this for the next step)
SELECT id, name, slug FROM organizations WHERE slug = 'admin';

-- 3. Create a super admin user account
-- First, you need to create the user in Supabase Auth
-- Go to Authentication > Users in your Supabase dashboard and create a user with:
-- Email: admin@member.ringing.org.uk
-- Password: (choose a secure password)
-- Then get the user ID and run the following:

-- Replace 'USER_ID_FROM_SUPABASE_AUTH' with the actual user ID from Supabase Auth
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

-- 4. Verify the setup
SELECT 
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    o.name as organization_name,
    o.slug as organization_slug
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE p.role = 'super_admin';