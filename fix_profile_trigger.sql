-- Fix the profile creation trigger
-- This ensures profiles are automatically created when users sign up

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the function with proper error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
  org_slug text;
  user_email text;
  user_first_name text;
  user_last_name text;
BEGIN
  -- Extract metadata from new user
  org_slug := NEW.raw_user_meta_data->>'organization_slug';
  user_email := NEW.email;
  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  -- Log for debugging
  RAISE LOG 'Creating profile for user: email=%, org_slug=%', user_email, org_slug;

  -- Look up organization by slug
  IF org_slug IS NOT NULL AND org_slug != '' THEN
    SELECT id INTO org_id
    FROM public.organizations
    WHERE slug = org_slug
    LIMIT 1;

    IF org_id IS NULL THEN
      RAISE LOG 'Organization not found for slug: %', org_slug;
    ELSE
      RAISE LOG 'Found organization: %', org_id;
    END IF;
  END IF;

  -- Create the profile
  -- For super admin, organization_id will be NULL
  INSERT INTO public.profiles (
    user_id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active
  ) VALUES (
    NEW.id,
    org_id,  -- Will be NULL for super admins
    user_email,
    user_first_name,
    user_last_name,
    CASE 
      WHEN org_id IS NULL THEN 'super_admin'
      ELSE 'member'
    END,
    true  -- Set to true by default, can be changed to false if approval needed
  );

  RAISE LOG 'Profile created successfully for user: %', user_email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE LOG 'Error creating profile: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Test that trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Verify function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
