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
    reminder_schedule jsonb DEFAULT '[]',
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
