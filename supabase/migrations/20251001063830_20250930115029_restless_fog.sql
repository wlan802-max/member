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
