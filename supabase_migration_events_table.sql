-- Migration: Events Table Creation
-- Description: Creates the events table that should exist before event registrations
-- This should be run BEFORE supabase_migration_event_registrations_committees.sql

-- ============================================================================
-- CREATE EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'conference', 'workshop', 'social', 'training', 'other')),
  location VARCHAR(300),
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_public ON events(is_public);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can view public events
DROP POLICY IF EXISTS "Anyone can view public events" ON events;
CREATE POLICY "Anyone can view public events"
  ON events
  FOR SELECT
  USING (is_public = true);

-- Members can view their organization's events
DROP POLICY IF EXISTS "Members can view org events" ON events;
CREATE POLICY "Members can view org events"
  ON events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

-- Admins can manage their organization's events
DROP POLICY IF EXISTS "Admins can manage org events" ON events;
CREATE POLICY "Admins can manage org events"
  ON events
  FOR ALL
  USING (
    -- Super admins can access everything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
    OR
    -- Org admins can access their own organization
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    -- Super admins can create/update for any organization
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
    OR
    -- Org admins can only create/update for their own organization
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_events_updated_at();

COMMENT ON TABLE events IS 'Organization events and activities';
-- Note: max_attendees and current_attendees columns will be added by supabase_migration_event_registrations_committees.sql
