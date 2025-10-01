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
