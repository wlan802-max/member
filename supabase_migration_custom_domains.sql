-- Migration: Custom Domain Mapping for Organizations
-- Description: Allows organizations to use custom domains with DNS verification and SSL support
-- Created: 2025-10-02

-- ============================================================================
-- 1. CREATE ORGANIZATION_DOMAINS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain varchar(255) NOT NULL UNIQUE CHECK (
    domain = lower(trim(domain)) AND
    domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'
  ),
  verification_status varchar(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_token varchar(64) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_primary boolean DEFAULT false,
  ssl_status varchar(20) DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'issued', 'failed', 'expired')),
  ssl_issued_at timestamptz,
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.organization_domains IS 'Custom domains configured for organizations';
COMMENT ON COLUMN public.organization_domains.domain IS 'Fully qualified domain name (e.g., frps.org.uk)';
COMMENT ON COLUMN public.organization_domains.verification_status IS 'DNS verification status: pending, verified, or failed';
COMMENT ON COLUMN public.organization_domains.verification_token IS 'Token for DNS TXT record verification';
COMMENT ON COLUMN public.organization_domains.is_primary IS 'Whether this is the primary domain for the organization';
COMMENT ON COLUMN public.organization_domains.ssl_status IS 'SSL certificate status';
COMMENT ON COLUMN public.organization_domains.ssl_issued_at IS 'When SSL certificate was last issued';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_domains_org ON public.organization_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_domains_verified ON public.organization_domains(verification_status) WHERE verification_status = 'verified';

-- Ensure only one primary domain per organization (prevents race conditions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_domains_one_primary 
  ON public.organization_domains(organization_id) 
  WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Public can read verified domains (for tenant detection)
DROP POLICY IF EXISTS "Public can view verified domains" ON public.organization_domains;
CREATE POLICY "Public can view verified domains"
  ON public.organization_domains
  FOR SELECT
  USING (verification_status = 'verified');

-- Organization admins can view their own domains
DROP POLICY IF EXISTS "Admins can view org domains" ON public.organization_domains;
CREATE POLICY "Admins can view org domains"
  ON public.organization_domains
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Organization admins can insert their own domains
DROP POLICY IF EXISTS "Admins can insert org domains" ON public.organization_domains;
CREATE POLICY "Admins can insert org domains"
  ON public.organization_domains
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Organization admins can update their own domains
DROP POLICY IF EXISTS "Admins can update org domains" ON public.organization_domains;
CREATE POLICY "Admins can update org domains"
  ON public.organization_domains
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Organization admins can delete their own domains
DROP POLICY IF EXISTS "Admins can delete org domains" ON public.organization_domains;
CREATE POLICY "Admins can delete org domains"
  ON public.organization_domains
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Function to get organization by custom domain
CREATE OR REPLACE FUNCTION public.get_organization_by_domain(domain_name text)
RETURNS TABLE (
  organization_id uuid,
  organization_slug varchar,
  organization_name varchar,
  domain varchar
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  canonical_domain text;
BEGIN
  -- Canonicalize the input domain (lowercase and trim)
  canonical_domain := lower(trim(domain_name));
  
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.slug as organization_slug,
    o.name as organization_name,
    od.domain
  FROM public.organization_domains od
  JOIN public.organizations o ON o.id = od.organization_id
  WHERE od.domain = canonical_domain
    AND od.verification_status = 'verified';
END;
$$;

COMMENT ON FUNCTION public.get_organization_by_domain IS 'Looks up organization by custom domain (used for tenant detection)';

-- Function to canonicalize domain names
CREATE OR REPLACE FUNCTION public.canonicalize_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically lowercase and trim domain
  NEW.domain = lower(trim(NEW.domain));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to canonicalize domains
DROP TRIGGER IF EXISTS canonicalize_domain_trigger ON public.organization_domains;
CREATE TRIGGER canonicalize_domain_trigger
  BEFORE INSERT OR UPDATE OF domain ON public.organization_domains
  FOR EACH ROW
  EXECUTE FUNCTION canonicalize_domain();

-- Function to ensure only one primary domain per organization
CREATE OR REPLACE FUNCTION public.ensure_single_primary_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a domain as primary, unset all other primary domains for this org
  IF NEW.is_primary = true THEN
    UPDATE public.organization_domains
    SET is_primary = false
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one primary domain
DROP TRIGGER IF EXISTS ensure_single_primary_domain_trigger ON public.organization_domains;
CREATE TRIGGER ensure_single_primary_domain_trigger
  BEFORE INSERT OR UPDATE ON public.organization_domains
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_domain();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_organization_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_organization_domains_updated_at_trigger ON public.organization_domains;
CREATE TRIGGER update_organization_domains_updated_at_trigger
  BEFORE UPDATE ON public.organization_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_domains_updated_at();

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_domains TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_by_domain TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_by_domain TO anon;
