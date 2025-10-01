# Database Setup Guide

This guide covers the complete database setup for the multi-tenant membership management system using Supabase.

## Prerequisites

- Supabase account and project
- Supabase CLI installed
- Project linked to your Supabase instance

## Database Schema Overview

The system uses a multi-tenant architecture with Row Level Security (RLS) to ensure complete data isolation between organizations.

### Core Tables

1. **organizations** - Tenant definitions
2. **profiles** - User profiles linked to organizations
3. **memberships** - Annual membership records
4. **digital_cards** - Wallet-compatible membership cards
5. **email_campaigns** - Email campaign management
6. **email_subscribers** - Mailing list management
7. **renewal_workflows** - Automated renewal processes

## Migration Files

### 1. Initial Schema Setup

Create the base tables and enable RLS:

```sql
-- File: supabase/migrations/001_initial_schema.sql

/*
# Initial Schema Setup

1. New Tables
   - `organizations` - Multi-tenant organization management
   - `profiles` - User profiles with organization association
   - `memberships` - Annual membership tracking
   - `digital_cards` - Digital wallet integration
   - `email_campaigns` - Email campaign management
   - `email_subscribers` - Mailing list management
   - `renewal_workflows` - Automated renewal processes

2. Security
   - Enable RLS on all tables
   - Create organization-based access policies
   - Set up proper indexes for performance

3. Functions
   - Organization creation helper
   - Membership renewal automation
   - Digital card generation
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table (tenant isolation)
CREATE TABLE IF NOT EXISTS organizations (
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

-- User profiles (organization-scoped)
CREATE TABLE IF NOT EXISTS profiles (
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

-- Memberships (annual membership tracking)
CREATE TABLE IF NOT EXISTS memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    membership_year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
    membership_type text DEFAULT 'standard',
    amount_paid decimal(10,2),
    payment_date timestamptz,
    payment_reference text,
    benefits jsonb DEFAULT '[]',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, profile_id, membership_year)
);

-- Digital membership cards
CREATE TABLE IF NOT EXISTS digital_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    membership_id uuid REFERENCES memberships(id) ON DELETE CASCADE,
    card_type text NOT NULL CHECK (card_type IN ('google_wallet', 'apple_wallet')),
    card_id text NOT NULL,
    pass_url text,
    qr_code_data text,
    is_active boolean DEFAULT true,
    issued_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(membership_id, card_type)
);

-- Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    template_id text,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    scheduled_at timestamptz,
    sent_at timestamptz,
    recipient_count integer DEFAULT 0,
    delivered_count integer DEFAULT 0,
    opened_count integer DEFAULT 0,
    clicked_count integer DEFAULT 0,
    bounced_count integer DEFAULT 0,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Email subscribers (mailing lists)
CREATE TABLE IF NOT EXISTS email_subscribers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    email text NOT NULL,
    first_name text,
    last_name text,
    status text DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
    subscription_date timestamptz DEFAULT now(),
    unsubscription_date timestamptz,
    tags text[] DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, email)
);

-- Renewal workflows
CREATE TABLE IF NOT EXISTS renewal_workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    renewal_period_start date NOT NULL,
    renewal_period_end date NOT NULL,
    reminder_schedule jsonb DEFAULT '[]', -- Array of reminder configurations
    email_template_id text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_workflows ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_profile_id ON memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_memberships_year ON memberships(membership_year);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_digital_cards_membership_id ON digital_cards(membership_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_organization_id ON email_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_organization_id ON email_subscribers(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_renewal_workflows_organization_id ON renewal_workflows(organization_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_digital_cards_updated_at BEFORE UPDATE ON digital_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_subscribers_updated_at BEFORE UPDATE ON email_subscribers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_renewal_workflows_updated_at BEFORE UPDATE ON renewal_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Row Level Security Policies

```sql
-- File: supabase/migrations/002_rls_policies.sql

/*
# Row Level Security Policies

1. Organization Policies
   - Super admins can manage all organizations
   - Organization admins can manage their own organization
   - Members can read their organization details

2. Profile Policies
   - Users can read/update their own profiles
   - Organization admins can manage profiles in their organization
   - Super admins can manage all profiles

3. Membership Policies
   - Members can read their own memberships
   - Organization admins can manage memberships in their organization
   - Super admins can manage all memberships

4. Digital Card Policies
   - Members can read their own digital cards
   - Organization admins can manage cards in their organization

5. Email Policies
   - Organization admins can manage email campaigns and subscribers
   - Super admins can manage all email data

6. Renewal Workflow Policies
   - Organization admins can manage renewal workflows
   - Super admins can manage all workflows
*/

-- Helper function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
BEGIN
    RETURN (
        SELECT organization_id 
        FROM profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is organization admin
CREATE OR REPLACE FUNCTION is_organization_admin(org_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE user_id = auth.uid() 
        AND organization_id = org_id 
        AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Super admins can manage all organizations"
    ON organizations
    FOR ALL
    TO authenticated
    USING (is_super_admin());

CREATE POLICY "Organization admins can read their organization"
    ON organizations
    FOR SELECT
    TO authenticated
    USING (id = get_user_organization_id());

CREATE POLICY "Organization admins can update their organization"
    ON organizations
    FOR UPDATE
    TO authenticated
    USING (id = get_user_organization_id() AND is_organization_admin(id));

-- Profiles policies
CREATE POLICY "Users can read their own profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Organization admins can manage profiles in their organization"
    ON profiles
    FOR ALL
    TO authenticated
    USING (is_organization_admin(organization_id));

CREATE POLICY "Super admins can manage all profiles"
    ON profiles
    FOR ALL
    TO authenticated
    USING (is_super_admin());

-- Memberships policies
CREATE POLICY "Members can read their own memberships"
    ON memberships
    FOR SELECT
    TO authenticated
    USING (profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Organization admins can manage memberships in their organization"
    ON memberships
    FOR ALL
    TO authenticated
    USING (is_organization_admin(organization_id));

CREATE POLICY "Super admins can manage all memberships"
    ON memberships
    FOR ALL
    TO authenticated
    USING (is_super_admin());

-- Digital cards policies
CREATE POLICY "Members can read their own digital cards"
    ON digital_cards
    FOR SELECT
    TO authenticated
    USING (membership_id IN (
        SELECT m.id FROM memberships m
        JOIN profiles p ON m.profile_id = p.id
        WHERE p.user_id = auth.uid()
    ));

CREATE POLICY "Organization admins can manage digital cards in their organization"
    ON digital_cards
    FOR ALL
    TO authenticated
    USING (is_organization_admin(organization_id));

CREATE POLICY "Super admins can manage all digital cards"
    ON digital_cards
    FOR ALL
    TO authenticated
    USING (is_super_admin());

-- Email campaigns policies
CREATE POLICY "Organization admins can manage email campaigns in their organization"
    ON email_campaigns
    FOR ALL
    TO authenticated
    USING (is_organization_admin(organization_id));

CREATE POLICY "Super admins can manage all email campaigns"
    ON email_campaigns
    FOR ALL
    TO authenticated
    USING (is_super_admin());

-- Email subscribers policies
CREATE POLICY "Organization admins can manage email subscribers in their organization"
    ON email_subscribers
    FOR ALL
    TO authenticated
    USING (is_organization_admin(organization_id));

CREATE POLICY "Super admins can manage all email subscribers"
    ON email_subscribers
    FOR ALL
    TO authenticated
    USING (is_super_admin());

-- Renewal workflows policies
CREATE POLICY "Organization admins can manage renewal workflows in their organization"
    ON renewal_workflows
    FOR ALL
    TO authenticated
    USING (is_organization_admin(organization_id));

CREATE POLICY "Super admins can manage all renewal workflows"
    ON renewal_workflows
    FOR ALL
    TO authenticated
    USING (is_super_admin());
```

### 3. Database Functions

```sql
-- File: supabase/migrations/003_database_functions.sql

/*
# Database Functions

1. Organization Management
   - Create organization with initial admin
   - Get organization by subdomain

2. Membership Management
   - Create membership with digital cards
   - Renew membership
   - Check membership status

3. Digital Card Management
   - Generate digital cards
   - Update card status

4. Email Management
   - Add subscriber to mailing list
   - Send campaign emails
*/

-- Function to create organization with initial admin
CREATE OR REPLACE FUNCTION create_organization_with_admin(
    org_name text,
    org_slug text,
    org_domain text,
    admin_email text,
    admin_first_name text,
    admin_last_name text,
    admin_user_id uuid
)
RETURNS uuid AS $$
DECLARE
    new_org_id uuid;
    new_profile_id uuid;
BEGIN
    -- Create organization
    INSERT INTO organizations (name, slug, domain, contact_email)
    VALUES (org_name, org_slug, org_domain, admin_email)
    RETURNING id INTO new_org_id;
    
    -- Create admin profile
    INSERT INTO profiles (user_id, organization_id, email, first_name, last_name, role)
    VALUES (admin_user_id, new_org_id, admin_email, admin_first_name, admin_last_name, 'admin')
    RETURNING id INTO new_profile_id;
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization by subdomain
CREATE OR REPLACE FUNCTION get_organization_by_subdomain(subdomain text)
RETURNS TABLE (
    id uuid,
    name text,
    slug text,
    domain text,
    logo_url text,
    primary_color text,
    secondary_color text,
    settings jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        o.domain,
        o.logo_url,
        o.primary_color,
        o.secondary_color,
        o.settings
    FROM organizations o
    WHERE o.slug = subdomain AND o.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create membership with digital cards
CREATE OR REPLACE FUNCTION create_membership_with_cards(
    p_organization_id uuid,
    p_profile_id uuid,
    p_membership_year integer,
    p_start_date date,
    p_end_date date,
    p_membership_type text DEFAULT 'standard',
    p_amount_paid decimal DEFAULT NULL,
    p_payment_reference text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    new_membership_id uuid;
BEGIN
    -- Create membership
    INSERT INTO memberships (
        organization_id, profile_id, membership_year, start_date, end_date,
        membership_type, amount_paid, payment_reference, status
    )
    VALUES (
        p_organization_id, p_profile_id, p_membership_year, p_start_date, p_end_date,
        p_membership_type, p_amount_paid, p_payment_reference, 'active'
    )
    RETURNING id INTO new_membership_id;
    
    -- Create digital cards (placeholders - actual generation happens in application)
    INSERT INTO digital_cards (organization_id, membership_id, card_type, card_id, expires_at)
    VALUES 
        (p_organization_id, new_membership_id, 'google_wallet', 'pending_' || new_membership_id::text, p_end_date),
        (p_organization_id, new_membership_id, 'apple_wallet', 'pending_' || new_membership_id::text, p_end_date);
    
    RETURN new_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check membership status
CREATE OR REPLACE FUNCTION check_membership_status(p_profile_id uuid, p_year integer DEFAULT NULL)
RETURNS TABLE (
    membership_id uuid,
    status text,
    start_date date,
    end_date date,
    is_current boolean
) AS $$
DECLARE
    check_year integer;
BEGIN
    -- Use current year if not specified
    check_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
    
    RETURN QUERY
    SELECT 
        m.id,
        m.status,
        m.start_date,
        m.end_date,
        (CURRENT_DATE BETWEEN m.start_date AND m.end_date) as is_current
    FROM memberships m
    WHERE m.profile_id = p_profile_id 
    AND m.membership_year = check_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add email subscriber
CREATE OR REPLACE FUNCTION add_email_subscriber(
    p_organization_id uuid,
    p_email text,
    p_first_name text DEFAULT NULL,
    p_last_name text DEFAULT NULL,
    p_tags text[] DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
    subscriber_id uuid;
BEGIN
    INSERT INTO email_subscribers (
        organization_id, email, first_name, last_name, tags, status
    )
    VALUES (
        p_organization_id, p_email, p_first_name, p_last_name, p_tags, 'subscribed'
    )
    ON CONFLICT (organization_id, email) 
    DO UPDATE SET 
        first_name = COALESCE(EXCLUDED.first_name, email_subscribers.first_name),
        last_name = COALESCE(EXCLUDED.last_name, email_subscribers.last_name),
        tags = EXCLUDED.tags,
        status = 'subscribed',
        subscription_date = CASE 
            WHEN email_subscribers.status != 'subscribed' THEN now()
            ELSE email_subscribers.subscription_date
        END,
        updated_at = now()
    RETURNING id INTO subscriber_id;
    
    RETURN subscriber_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get renewal candidates
CREATE OR REPLACE FUNCTION get_renewal_candidates(p_organization_id uuid, p_year integer)
RETURNS TABLE (
    profile_id uuid,
    email text,
    first_name text,
    last_name text,
    last_membership_end date,
    days_since_expiry integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        m.end_date,
        (CURRENT_DATE - m.end_date)::integer as days_since_expiry
    FROM profiles p
    LEFT JOIN memberships m ON p.id = m.profile_id 
        AND m.membership_year = p_year - 1
    WHERE p.organization_id = p_organization_id
    AND p.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM memberships m2 
        WHERE m2.profile_id = p.id 
        AND m2.membership_year = p_year
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Running Migrations

### Using Supabase CLI

1. **Link your project**:
```bash
supabase link --project-ref your-project-ref
```

2. **Push migrations**:
```bash
supabase db push
```

3. **Generate TypeScript types**:
```bash
supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

### Manual Migration

If you prefer to run migrations manually:

1. Copy the SQL content from each migration file
2. Run them in order in your Supabase SQL editor
3. Verify all tables and policies are created correctly

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

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
```

## Sample Data

To test the system, you can insert sample data:

```sql
-- Create a sample organization
SELECT create_organization_with_admin(
    'Bell Ringers Association',
    'bellringers',
    'bellringers.member.ringing.org.uk',
    'admin@bellringers.org',
    'John',
    'Smith',
    auth.uid() -- Replace with actual user ID
);
```

## Backup and Maintenance

### Regular Backups
```bash
# Backup database
supabase db dump --local > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
supabase db reset --local
psql -h localhost -p 54322 -U postgres -d postgres < backup_file.sql
```

### Performance Monitoring
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

This completes the database setup. The schema provides a solid foundation for the multi-tenant membership management system with proper security, performance optimization, and data integrity.