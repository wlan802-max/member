-- Diagnostic: Check all profiles and memberships for FRPS organization

-- 1. Find the FRPS organization ID
SELECT id, slug, name FROM organizations WHERE slug = 'frps';

-- 2. Check all profiles for FRPS (replace org_id with actual ID from above)
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.is_active,
  p.created_at
FROM profiles p
WHERE p.organization_id = 'dd554146-46b9-489f-abce-20497ccc4624'  -- Replace with actual org ID
ORDER BY p.created_at DESC;

-- 3. Check all memberships for these profiles
SELECT 
  m.id,
  m.profile_id,
  m.membership_year,
  m.status,
  m.amount_paid,
  m.created_at,
  p.email,
  p.first_name,
  p.last_name
FROM memberships m
JOIN profiles p ON m.profile_id = p.id
WHERE m.organization_id = 'dd554146-46b9-489f-abce-20497ccc4624'  -- Replace with actual org ID
ORDER BY m.created_at DESC;

-- 4. Check auth users without profiles
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  u.raw_user_meta_data->>'organization_slug' as org_slug
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.id IS NULL
  AND u.email_confirmed_at IS NOT NULL
ORDER BY u.created_at DESC;
