-- Manually create profiles for users who signed up but don't have a profile yet
-- Run this AFTER running fix_profile_trigger.sql

-- First, check which auth users don't have profiles
SELECT 
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'first_name' as first_name,
  u.raw_user_meta_data->>'last_name' as last_name,
  u.raw_user_meta_data->>'organization_slug' as org_slug,
  u.created_at,
  u.email_confirmed_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.id IS NULL
  AND u.email_confirmed_at IS NOT NULL  -- Only confirmed users
ORDER BY u.created_at DESC;

-- To manually create the missing profile, uncomment and run this:
-- (Replace the values with the actual data from above)
/*
DO $$
DECLARE
  v_user_id uuid := 'USER_ID_FROM_ABOVE';  -- Replace with actual user ID
  v_email text := 'user@example.com';  -- Replace with actual email
  v_first_name text := 'First';  -- Replace with actual first name
  v_last_name text := 'Last';  -- Replace with actual last name
  v_org_slug text := 'frps';  -- Replace with actual org slug
  v_org_id uuid;
BEGIN
  -- Look up organization
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE slug = v_org_slug;

  -- Create the profile
  INSERT INTO public.profiles (
    user_id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active
  ) VALUES (
    v_user_id,
    v_org_id,
    v_email,
    v_first_name,
    v_last_name,
    'member',
    true
  );

  RAISE NOTICE 'Profile created successfully for %', v_email;
END $$;
*/
