-- Setup Organizations for Multi-Tenant System
-- Run this in your Supabase SQL Editor

-- 1. Create Super Admin Organization
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
    is_active = true;

-- 2. Create Demo Organization
INSERT INTO organizations (
    slug,
    name,
    domain,
    contact_email,
    primary_color,
    secondary_color,
    is_active
) VALUES (
    'demo',
    'Demo Organization',
    'demo.member.ringing.org.uk',
    'demo@example.com',
    '#059669',
    '#10B981',
    true
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = true;

-- 3. Verify organizations were created
SELECT
    slug,
    name,
    domain,
    is_active,
    created_at
FROM organizations
ORDER BY
    CASE
        WHEN slug = 'admin' THEN 1
        WHEN slug = 'demo' THEN 2
        ELSE 3
    END;
