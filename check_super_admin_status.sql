-- Diagnostic query to check super admin account status
-- Run this in Supabase SQL Editor

-- 1. Check if super admin profile exists and its status
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.is_active,
  p.organization_id,
  p.created_at
FROM profiles p
WHERE p.role = 'super_admin'
ORDER BY p.created_at DESC;

-- 2. Check if the auth user exists
SELECT 
  id,
  email,
  email_confirmed_at,
  banned_until,
  deleted_at,
  created_at,
  updated_at
FROM auth.users
WHERE email = 'will@w-j-lander.uk';  -- Replace with your super admin email

-- 3. If the profile exists but is_active is false, fix it:
-- UPDATE profiles 
-- SET is_active = true 
-- WHERE role = 'super_admin' AND email = 'will@w-j-lander.uk';
