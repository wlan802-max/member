-- Migration: Add Multiple Mailing Lists Support
-- This migration adds support for multiple mailing lists that members can subscribe to

-- 1. Create mailing_lists table
CREATE TABLE IF NOT EXISTS mailing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Create subscriber_lists junction table (many-to-many)
CREATE TABLE IF NOT EXISTS subscriber_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES email_subscribers(id) ON DELETE CASCADE,
  mailing_list_id UUID NOT NULL REFERENCES mailing_lists(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'pending')),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, mailing_list_id)
);

-- 3. Add mailing_list_id to email_campaigns (optional - campaign can target specific lists)
ALTER TABLE email_campaigns 
ADD COLUMN IF NOT EXISTS mailing_list_id UUID REFERENCES mailing_lists(id) ON DELETE SET NULL;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mailing_lists_org ON mailing_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_mailing_lists_slug ON mailing_lists(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_subscriber_lists_subscriber ON subscriber_lists(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_lists_list ON subscriber_lists(mailing_list_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_lists_status ON subscriber_lists(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_list ON email_campaigns(mailing_list_id);

-- 5. Create trigger to update subscriber_count (only count 'subscribed' status)
CREATE OR REPLACE FUNCTION update_mailing_list_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE mailing_lists
    SET subscriber_count = (
      SELECT COUNT(*)
      FROM subscriber_lists
      WHERE mailing_list_id = NEW.mailing_list_id
        AND status = 'subscribed'
    ),
    updated_at = NOW()
    WHERE id = NEW.mailing_list_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE mailing_lists
    SET subscriber_count = (
      SELECT COUNT(*)
      FROM subscriber_lists
      WHERE mailing_list_id = OLD.mailing_list_id
        AND status = 'subscribed'
    ),
    updated_at = NOW()
    WHERE id = OLD.mailing_list_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriber_count
AFTER INSERT OR UPDATE OR DELETE ON subscriber_lists
FOR EACH ROW
EXECUTE FUNCTION update_mailing_list_subscriber_count();

-- 6. Create updated_at trigger for mailing_lists
CREATE TRIGGER set_updated_at_mailing_lists
BEFORE UPDATE ON mailing_lists
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_subscriber_lists
BEFORE UPDATE ON subscriber_lists
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable RLS on new tables
ALTER TABLE mailing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_lists ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for mailing_lists
-- Allow organization members to view their organization's lists
CREATE POLICY "Users can view their organization's mailing lists"
ON mailing_lists FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Allow organization admins to insert mailing lists
CREATE POLICY "Admins can insert mailing lists"
ON mailing_lists FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Allow organization admins to update their organization's mailing lists
CREATE POLICY "Admins can update their organization's mailing lists"
ON mailing_lists FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Allow organization admins to delete their organization's mailing lists
CREATE POLICY "Admins can delete their organization's mailing lists"
ON mailing_lists FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- 9. RLS Policies for subscriber_lists
-- Users can view their own subscriptions, admins can view all in their org
CREATE POLICY "Users can view list subscriptions"
ON subscriber_lists FOR SELECT
USING (
  subscriber_id IN (
    SELECT s.id FROM email_subscribers s
    JOIN profiles p ON p.email = s.email
    WHERE p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM email_subscribers s
    JOIN mailing_lists ml ON ml.id = subscriber_lists.mailing_list_id
    JOIN profiles p ON p.organization_id = ml.organization_id
    WHERE s.id = subscriber_lists.subscriber_id
    AND p.user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Users can subscribe themselves to lists
CREATE POLICY "Users can subscribe to lists"
ON subscriber_lists FOR INSERT
WITH CHECK (
  subscriber_id IN (
    SELECT s.id FROM email_subscribers s
    JOIN profiles p ON p.email = s.email
    WHERE p.user_id = auth.uid()
  )
  AND
  mailing_list_id IN (
    SELECT ml.id FROM mailing_lists ml
    JOIN profiles p ON p.organization_id = ml.organization_id
    WHERE p.user_id = auth.uid()
  )
);

-- Users can update their own subscriptions (change status)
CREATE POLICY "Users can update their own subscriptions"
ON subscriber_lists FOR UPDATE
USING (
  subscriber_id IN (
    SELECT s.id FROM email_subscribers s
    JOIN profiles p ON p.email = s.email
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  subscriber_id IN (
    SELECT s.id FROM email_subscribers s
    JOIN profiles p ON p.email = s.email
    WHERE p.user_id = auth.uid()
  )
);

-- Admins can update any subscription in their organization
CREATE POLICY "Admins can update org subscriptions"
ON subscriber_lists FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM email_subscribers s
    JOIN mailing_lists ml ON ml.id = subscriber_lists.mailing_list_id
    JOIN profiles p ON p.organization_id = ml.organization_id
    WHERE s.id = subscriber_lists.subscriber_id
    AND p.user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM email_subscribers s
    JOIN mailing_lists ml ON ml.id = subscriber_lists.mailing_list_id
    JOIN profiles p ON p.organization_id = ml.organization_id
    WHERE s.id = subscriber_lists.subscriber_id
    AND p.user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Users can unsubscribe (delete their subscription)
CREATE POLICY "Users can delete their own subscriptions"
ON subscriber_lists FOR DELETE
USING (
  subscriber_id IN (
    SELECT s.id FROM email_subscribers s
    JOIN profiles p ON p.email = s.email
    WHERE p.user_id = auth.uid()
  )
);

-- Admins can delete any subscription in their organization
CREATE POLICY "Admins can delete org subscriptions"
ON subscriber_lists FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM email_subscribers s
    JOIN mailing_lists ml ON ml.id = subscriber_lists.mailing_list_id
    JOIN profiles p ON p.organization_id = ml.organization_id
    WHERE s.id = subscriber_lists.subscriber_id
    AND p.user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- 10. Create a default "General" mailing list for each organization
INSERT INTO mailing_lists (organization_id, name, description, slug, is_active)
SELECT 
  id,
  'General Announcements',
  'Default mailing list for general organization announcements',
  'general',
  true
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM mailing_lists 
  WHERE organization_id = organizations.id AND slug = 'general'
);

-- 11. Migrate existing subscribers to the "General" list (only if subscribed)
INSERT INTO subscriber_lists (subscriber_id, mailing_list_id, status, subscribed_at)
SELECT 
  s.id,
  ml.id,
  s.status,
  s.subscription_date
FROM email_subscribers s
JOIN mailing_lists ml ON ml.organization_id = s.organization_id AND ml.slug = 'general'
WHERE s.status = 'subscribed'
AND NOT EXISTS (
  SELECT 1 FROM subscriber_lists sl
  WHERE sl.subscriber_id = s.id AND sl.mailing_list_id = ml.id
)
ON CONFLICT (subscriber_id, mailing_list_id) DO NOTHING;

-- Comments
COMMENT ON TABLE mailing_lists IS 'Stores different mailing lists for each organization';
COMMENT ON TABLE subscriber_lists IS 'Junction table for subscriber-mailing list many-to-many relationship';
COMMENT ON COLUMN email_campaigns.mailing_list_id IS 'Optional: Target a specific mailing list instead of all subscribers';
