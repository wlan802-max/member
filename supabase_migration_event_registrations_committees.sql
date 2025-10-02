-- Migration: Event Registration & RSVP + Committees with Mailing Lists
-- This migration adds event registration functionality and committee management

-- ============================================================================
-- PART 1: EVENT REGISTRATIONS & RSVP
-- ============================================================================

-- 1. Add new columns to events table for registration management
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS max_attendees INTEGER,
ADD COLUMN IF NOT EXISTS current_attendees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS allow_waitlist BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT false;

-- 2. Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'waitlist', 'cancelled', 'checked_in', 'pending_approval')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, profile_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_profile ON event_registrations(profile_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_org ON event_registrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(status);

-- 4. Create trigger to update current_attendees count
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE events
    SET current_attendees = (
      SELECT COUNT(*)
      FROM event_registrations
      WHERE event_id = NEW.event_id
        AND status IN ('registered', 'checked_in')
    ),
    updated_at = NOW()
    WHERE id = NEW.event_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE events
    SET current_attendees = (
      SELECT COUNT(*)
      FROM event_registrations
      WHERE event_id = OLD.event_id
        AND status IN ('registered', 'checked_in')
    ),
    updated_at = NOW()
    WHERE id = OLD.event_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_attendee_count
AFTER INSERT OR UPDATE OR DELETE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION update_event_attendee_count();

-- 5. Create updated_at trigger for event_registrations
CREATE TRIGGER set_updated_at_event_registrations
BEFORE UPDATE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable RLS on event_registrations
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for event_registrations
-- Members can view registrations for their organization
CREATE POLICY "Members can view org event registrations"
ON event_registrations FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Members can register themselves for events (verify event belongs to their org)
CREATE POLICY "Members can register for events"
ON event_registrations FOR INSERT
WITH CHECK (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  AND organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
  AND event_id IN (
    SELECT e.id FROM events e
    JOIN profiles p ON p.organization_id = e.organization_id
    WHERE p.user_id = auth.uid()
  )
);

-- Members can only cancel their own registrations (not check-in or approve themselves)
CREATE POLICY "Members can update own registrations"
ON event_registrations FOR UPDATE
USING (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  AND status IN ('cancelled', 'waitlist')
);

-- Admins can update any registration in their org
CREATE POLICY "Admins can update org registrations"
ON event_registrations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = event_registrations.organization_id
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = event_registrations.organization_id
    AND role IN ('admin', 'super_admin')
  )
);

-- Members can cancel their own registrations
CREATE POLICY "Members can delete own registrations"
ON event_registrations FOR DELETE
USING (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can delete any registration in their org
CREATE POLICY "Admins can delete org registrations"
ON event_registrations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = event_registrations.organization_id
    AND role IN ('admin', 'super_admin')
  )
);

-- ============================================================================
-- PART 2: COMMITTEES WITH MAILING LISTS
-- ============================================================================

-- 8. Create committees table
CREATE TABLE IF NOT EXISTS committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL,
  mailing_list_id UUID REFERENCES mailing_lists(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 9. Create committee_members junction table
CREATE TABLE IF NOT EXISTS committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('chair', 'vice_chair', 'secretary', 'treasurer', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(committee_id, profile_id)
);

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_committees_org ON committees(organization_id);
CREATE INDEX IF NOT EXISTS idx_committees_slug ON committees(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_committees_mailing_list ON committees(mailing_list_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_committee ON committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_profile ON committee_members(profile_id);

-- 11. Create trigger to update committee member_count
CREATE OR REPLACE FUNCTION update_committee_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE committees
    SET member_count = (
      SELECT COUNT(*)
      FROM committee_members
      WHERE committee_id = NEW.committee_id
    ),
    updated_at = NOW()
    WHERE id = NEW.committee_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE committees
    SET member_count = (
      SELECT COUNT(*)
      FROM committee_members
      WHERE committee_id = OLD.committee_id
    ),
    updated_at = NOW()
    WHERE id = OLD.committee_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_committee_member_count
AFTER INSERT OR UPDATE OR DELETE ON committee_members
FOR EACH ROW
EXECUTE FUNCTION update_committee_member_count();

-- 12. Create trigger to sync committee members with mailing list
CREATE OR REPLACE FUNCTION sync_committee_mailing_list()
RETURNS TRIGGER AS $$
DECLARE
  v_mailing_list_id UUID;
  v_subscriber_id UUID;
  v_profile_email VARCHAR;
BEGIN
  -- Get the mailing list for this committee
  SELECT mailing_list_id INTO v_mailing_list_id
  FROM committees
  WHERE id = COALESCE(NEW.committee_id, OLD.committee_id);
  
  -- Only proceed if committee has a linked mailing list
  IF v_mailing_list_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    -- Get profile email and names
    SELECT email INTO v_profile_email
    FROM profiles
    WHERE id = NEW.profile_id;
    
    -- Find or create subscriber
    SELECT id INTO v_subscriber_id
    FROM subscribers
    WHERE email = v_profile_email
    AND organization_id = (SELECT organization_id FROM committees WHERE id = NEW.committee_id);
    
    -- Create subscriber if it doesn't exist
    IF v_subscriber_id IS NULL THEN
      INSERT INTO subscribers (organization_id, email, first_name, last_name, status, subscribed_at)
      SELECT 
        c.organization_id,
        p.email,
        p.first_name,
        p.last_name,
        'subscribed',
        NOW()
      FROM committees c
      JOIN profiles p ON p.id = NEW.profile_id
      WHERE c.id = NEW.committee_id
      RETURNING id INTO v_subscriber_id;
    END IF;
    
    -- Subscribe to mailing list
    IF v_subscriber_id IS NOT NULL THEN
      INSERT INTO subscriber_lists (subscriber_id, mailing_list_id, status, subscribed_at)
      VALUES (v_subscriber_id, v_mailing_list_id, 'subscribed', NOW())
      ON CONFLICT (subscriber_id, mailing_list_id) 
      DO UPDATE SET status = 'subscribed', subscribed_at = NOW(), unsubscribed_at = NULL;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Get profile email
    SELECT email INTO v_profile_email
    FROM profiles
    WHERE id = OLD.profile_id;
    
    -- Find subscriber
    SELECT id INTO v_subscriber_id
    FROM subscribers
    WHERE email = v_profile_email
    AND organization_id = (SELECT organization_id FROM committees WHERE id = OLD.committee_id);
    
    IF v_subscriber_id IS NOT NULL THEN
      -- Unsubscribe from mailing list
      UPDATE subscriber_lists
      SET status = 'unsubscribed', unsubscribed_at = NOW()
      WHERE subscriber_id = v_subscriber_id
      AND mailing_list_id = v_mailing_list_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_committee_mailing_list
AFTER INSERT OR DELETE ON committee_members
FOR EACH ROW
EXECUTE FUNCTION sync_committee_mailing_list();

-- 13. Create updated_at triggers
CREATE TRIGGER set_updated_at_committees
BEFORE UPDATE ON committees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_committee_members
BEFORE UPDATE ON committee_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 14. Enable RLS on new tables
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies for committees
-- Members can view their organization's committees
CREATE POLICY "Members can view org committees"
ON committees FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can insert committees
CREATE POLICY "Admins can insert committees"
ON committees FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Admins can update their organization's committees
CREATE POLICY "Admins can update org committees"
ON committees FOR UPDATE
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

-- Admins can delete their organization's committees
CREATE POLICY "Admins can delete org committees"
ON committees FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- 16. RLS Policies for committee_members
-- Members can view committee memberships in their org
CREATE POLICY "Members can view committee memberships"
ON committee_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM committees c
    JOIN profiles p ON p.organization_id = c.organization_id
    WHERE c.id = committee_members.committee_id
    AND p.user_id = auth.uid()
  )
);

-- Admins can add committee members
CREATE POLICY "Admins can add committee members"
ON committee_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM committees c
    JOIN profiles p ON p.organization_id = c.organization_id
    WHERE c.id = committee_members.committee_id
    AND p.user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Admins can update committee members
CREATE POLICY "Admins can update committee members"
ON committee_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM committees c
    JOIN profiles p ON p.organization_id = c.organization_id
    WHERE c.id = committee_members.committee_id
    AND p.user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM committees c
    JOIN profiles p ON p.organization_id = c.organization_id
    WHERE c.id = committee_members.committee_id
    AND p.user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Admins can remove committee members
CREATE POLICY "Admins can remove committee members"
ON committee_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM committees c
    JOIN profiles p ON p.organization_id = c.organization_id
    WHERE c.id = committee_members.committee_id
    AND p.user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Comments
COMMENT ON TABLE event_registrations IS 'Stores member registrations for events with RSVP, waitlist, and check-in functionality';
COMMENT ON TABLE committees IS 'Stores organization committees with optional linked mailing lists';
COMMENT ON TABLE committee_members IS 'Junction table for committee membership with roles';
COMMENT ON COLUMN committees.mailing_list_id IS 'Optional: Link committee to a mailing list for automatic member subscription';
