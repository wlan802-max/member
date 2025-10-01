# Database Setup Guide

This guide covers the Supabase database setup for the multi-tenant membership management system.

## Prerequisites

- Supabase account and project
- Project linked to your Supabase instance

## Database Schema Overview

The system uses a multi-tenant architecture with Row Level Security (RLS) to ensure complete data isolation between organizations.

### Core Tables

1. **organizations** - Tenant definitions
2. **profiles** - User profiles linked to organizations
3. **memberships** - Membership records (future feature)

## Migration Files

### Running Migrations

1. **Access Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run migrations in order:**
   - `supabase/migrations/20251001063749_20250929231345_bitter_cake.sql`
   - `supabase/migrations/20251001063812_20250930111734_violet_valley.sql`
   - `supabase/migrations/20251001063830_20250930115029_restless_fog.sql`

3. **Create sample organizations:**
   - Run `setup-organizations.sql` to create test organizations

## Schema Details

### organizations Table

Stores organization/tenant information:

```sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  domain text UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#3B82F6',
  secondary_color text DEFAULT '#1E40AF',
  contact_email text NOT NULL,
  contact_phone text,
  address jsonb,
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### profiles Table

Stores user profiles linked to organizations:

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  address jsonb,
  role text DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super_admin')),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id)
);
```

## Row Level Security (RLS)

RLS policies ensure complete data isolation:

### Organizations Policies

- Super admins can manage all organizations
- Organization admins can read/update their organization
- Members can read their organization details

### Profiles Policies

- Users can read/update their own profile
- Organization admins can manage profiles in their organization
- Super admins can manage all profiles

## Helper Functions

### get_user_organization_id()

Returns the organization ID for the current user.

### is_super_admin()

Checks if the current user has super admin role.

### is_organization_admin(org_id)

Checks if the current user is an admin of the specified organization.

## Verification

After running migrations, verify the setup:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

## Creating Organizations

To create a new organization:

```sql
INSERT INTO organizations (
  slug,
  name,
  contact_email,
  primary_color,
  secondary_color
) VALUES (
  'bellringers',
  'Bell Ringers Association',
  'admin@bellringers.org',
  '#3B82F6',
  '#1E40AF'
);
```

## Creating Super Admin

To create a super admin user:

1. Sign up through Supabase Auth UI
2. Get the user ID from auth.users table
3. Create a profile with super_admin role:

```sql
INSERT INTO profiles (
  user_id,
  organization_id,
  email,
  first_name,
  last_name,
  role
) VALUES (
  'user-uuid-here',
  (SELECT id FROM organizations WHERE slug = 'admin'),
  'admin@example.com',
  'Super',
  'Admin',
  'super_admin'
);
```

## Troubleshooting

### RLS Policies Not Working

- Ensure RLS is enabled on all tables
- Check that helper functions are created correctly
- Verify user has correct role in profiles table

### Cannot Access Organization Data

- Check that organization is_active = true
- Verify user has profile record in correct organization
- Check RLS policies allow the operation

### Migrations Failing

- Run migrations in correct order
- Check for existing tables (migrations handle IF EXISTS)
- Review error messages for specific issues

## Backup

Regular backups are automatically handled by Supabase. You can also manually backup:

```bash
# Using Supabase CLI
supabase db dump --local > backup_$(date +%Y%m%d).sql
```

## Performance

Indexes are automatically created on:
- organizations.slug
- organizations.domain
- profiles.user_id
- profiles.organization_id
- profiles.email

## Security Considerations

1. **Data Isolation**: RLS ensures complete tenant separation
2. **Authentication**: Uses Supabase Auth with JWT tokens
3. **HTTPS**: Always use HTTPS in production
4. **Sensitive Data**: Never store sensitive data in metadata JSONB fields
5. **Audit Logging**: Consider adding audit log table for compliance

## Next Steps

After database setup:
1. Configure environment variables
2. Test authentication flow
3. Create test organizations and users
4. Verify RLS policies work correctly
