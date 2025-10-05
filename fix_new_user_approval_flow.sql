-- Fix the profile creation trigger to require admin approval
-- New users should be created with is_active = false and status = 'pending'

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the function with proper approval workflow
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
  user_role text;
BEGIN
  -- Extract metadata from new user
  org_slug := NEW.raw_user_meta_data->>'organization_slug';
  user_email := NEW.email;
  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  
  -- SECURITY: NEVER trust client-provided role - always default to 'member'
  -- Only specific server-controlled processes should create super_admin/admin
  -- Client-provided role is IGNORED for security
  user_role := 'member';  -- ALWAYS member for regular signups

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

  -- SECURITY: All regular signups MUST have a valid organization
  -- Invalid/missing org → Locked account, requires manual review
  -- Super admin creation must happen via separate server-controlled process
  IF org_id IS NULL OR org_slug IS NULL OR org_slug = '' THEN
    -- No valid organization - lock the account for security review
    RAISE LOG 'WARNING: User signup with invalid/missing org_slug: email=%, org_slug=% - creating LOCKED profile', user_email, org_slug;
    
    INSERT INTO public.profiles (
      user_id,
      organization_id,
      email,
      first_name,
      last_name,
      role,
      is_active,
      status
    ) VALUES (
      NEW.id,
      NULL,  -- No organization
      user_email,
      user_first_name,
      user_last_name,
      'member',  -- Always member for invalid signups
      false,  -- LOCKED - cannot access system
      'pending'  -- Requires manual super admin review
    );
    
    RAISE LOG 'Created LOCKED profile for user with invalid org: %', user_email;
    RETURN NEW;
  END IF;

  -- Create the profile for valid organization signup
  -- SECURITY: All profiles created here are 'member' role with pending status
  -- Super admin and org admin creation happen via separate server-controlled processes
  INSERT INTO public.profiles (
    user_id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    status
  ) VALUES (
    NEW.id,
    org_id,  -- Valid organization ID
    user_email,
    user_first_name,
    user_last_name,
    'member',  -- ALWAYS member for regular signups (never trust client role)
    false,  -- Requires admin approval
    'pending'  -- Awaiting admin approval
  );

  RAISE LOG 'Profile created successfully for user: % with role=member is_active=false status=pending in org=%', 
    user_email,
    org_id;

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

-- Show sample of profiles to verify status
SELECT 
  id,
  email,
  role,
  is_active,
  status,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;
