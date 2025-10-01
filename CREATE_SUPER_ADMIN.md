# How to Create Super Admin User

## Step 1: Create User in Supabase Auth

1. Go to your Supabase Dashboard: https://0ec90b57d6e95fcbda19832f.supabase.co
2. Click **Authentication** in the left sidebar
3. Click **Users** tab
4. Click **Add user** button (or **Invite user**)
5. Enter:
   - **Email:** `admin@member.ringing.org.uk` (or your preferred email)
   - **Password:** Choose a secure password (you'll use this to log in)
   - **Auto Confirm User:** ✅ Check this box (important!)
6. Click **Create user** or **Send invitation**
7. **Copy the User ID** - you'll need it for the next step

## Step 2: Get Organization ID

In Supabase SQL Editor, run:

```sql
SELECT id, slug, name FROM organizations WHERE slug = 'admin';
```

**Copy the `id` value** - this is your organization ID.

## Step 3: Create Super Admin Profile

In Supabase SQL Editor, run this query (replace the placeholder values):

```sql
INSERT INTO profiles (
    user_id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active
) VALUES (
    'PASTE_USER_ID_HERE',
    'PASTE_ORG_ID_HERE',
    'admin@member.ringing.org.uk',
    'System',
    'Administrator',
    'super_admin',
    true
);
```

### Example (with sample IDs):
```sql
INSERT INTO profiles (
    user_id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active
) VALUES (
    '12345678-1234-1234-1234-123456789abc',
    '87654321-4321-4321-4321-cba987654321',
    'admin@member.ringing.org.uk',
    'System',
    'Administrator',
    'super_admin',
    true
);
```

## Step 4: Verify Super Admin Creation

Run this query to confirm:

```sql
SELECT
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.is_active,
    o.name as organization_name,
    o.slug as organization_slug
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE p.role = 'super_admin';
```

You should see your super admin user listed.

## Step 5: Test Login

1. Visit: `http://localhost:5173?org=admin`
2. Enter your email and password
3. You should be logged in as super admin!

## Quick Script Method

If you prefer, here's a single query that does it all (run in Supabase SQL Editor):

```sql
-- First, create the user in Supabase Auth Dashboard (Step 1)
-- Then run this, replacing YOUR_USER_ID with the ID from Auth:

DO $$
DECLARE
    admin_org_id uuid;
BEGIN
    -- Get the admin organization ID
    SELECT id INTO admin_org_id FROM organizations WHERE slug = 'admin';

    -- Create the super admin profile
    INSERT INTO profiles (
        user_id,
        organization_id,
        email,
        first_name,
        last_name,
        role,
        is_active
    ) VALUES (
        'YOUR_USER_ID',  -- Replace with actual user ID from Auth
        admin_org_id,
        'admin@member.ringing.org.uk',
        'System',
        'Administrator',
        'super_admin',
        true
    );
END $$;
```

## Troubleshooting

### "User already exists"
If you get this error, the profile already exists. Check with:
```sql
SELECT * FROM profiles WHERE email = 'admin@member.ringing.org.uk';
```

### "Foreign key violation"
This means either:
- The user_id doesn't exist in auth.users
- The organization_id doesn't exist in organizations

Verify both exist:
```sql
-- Check user exists
SELECT id, email FROM auth.users WHERE email = 'admin@member.ringing.org.uk';

-- Check organization exists
SELECT id, slug FROM organizations WHERE slug = 'admin';
```

### Can't log in
1. Verify the user is confirmed in Auth dashboard
2. Check the profile exists and is_active = true
3. Make sure you're using the correct URL: `?org=admin`
4. Check browser console for errors

## Summary

✅ Create user in Supabase Auth (get user ID)
✅ Get admin organization ID from database
✅ Insert profile record linking them
✅ Verify with SELECT query
✅ Test login at `?org=admin`
